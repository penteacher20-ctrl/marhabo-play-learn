-- suggestions
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  image_url text,
  link_url text,
  status text not null default 'new' check (status in ('new','reviewed','resolved','rejected')),
  admin_response text,
  seen_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suggestions to authenticated;
grant all on public.suggestions to service_role;
alter table public.suggestions enable row level security;

create policy "Users read own suggestions"
  on public.suggestions for select to authenticated
  using (auth.uid() = user_id);
create policy "Admins read all suggestions"
  on public.suggestions for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy "Users insert own suggestions"
  on public.suggestions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Admins update suggestions"
  on public.suggestions for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy "Admins delete suggestions"
  on public.suggestions for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create index suggestions_user_id_idx on public.suggestions(user_id);
create index suggestions_status_idx on public.suggestions(status);
create index suggestions_created_at_idx on public.suggestions(created_at desc);

-- reuse the standard updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger suggestions_updated_at
  before update on public.suggestions
  for each row execute function public.set_updated_at();

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'suggestion' check (type in ('suggestion','system')),
  title text not null,
  message text not null,
  reference_id uuid,
  reference_type text default 'suggestion',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "Users mark own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admins delete notifications"
  on public.notifications for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create index notifications_user_id_idx on public.notifications(user_id, is_read);
create index notifications_created_at_idx on public.notifications(created_at desc);

-- realtime
alter publication supabase_realtime add table public.notifications;

-- storage policies for suggestion-images (private bucket)
create policy "Users upload own suggestion images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'suggestion-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users read own suggestion images"
  on storage.objects for select to authenticated
  using (bucket_id = 'suggestion-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Admins read all suggestion images"
  on storage.objects for select to authenticated
  using (bucket_id = 'suggestion-images' and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')));
create policy "Admins delete suggestion images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'suggestion-images' and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')));