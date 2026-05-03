
-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- auto create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  type text not null default 'html',
  thumbnail_url text,
  file_url text,
  is_public boolean not null default true,
  play_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;
create policy "Public games viewable by all" on public.games for select using (is_public or auth.uid() = user_id);
create policy "Users insert own games" on public.games for insert with check (auth.uid() = user_id);
create policy "Users update own games" on public.games for update using (auth.uid() = user_id);
create policy "Users delete own games" on public.games for delete using (auth.uid() = user_id);

-- templates (public read)
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  icon text,
  is_available boolean not null default true,
  sort_order integer not null default 0
);
alter table public.templates enable row level security;
create policy "Templates viewable by all" on public.templates for select using (true);

insert into public.templates (slug,name_ar,name_en,description_ar,description_en,icon,is_available,sort_order) values
('puzzle','بازل','Puzzle','اسحب القطع لإكمال الصورة','Drag pieces to complete the image','🧩',true,1),
('draw','رسم وتلوين','Draw & Color','كتاب التلوين التفاعلي','Interactive coloring book','✏️',true,2),
('quiz','اختيار من متعدد','Quiz / MCQ','أسئلة بخيارات متعددة','Multiple choice questions','❓',true,3),
('matching','مطابقة','Matching Pairs','طابق الأزواج المتشابهة','Match the matching pairs','🔗',true,4),
('wheel','عجلة الحظ','Spin the Wheel','لف العجلة واختر','Spin the wheel and pick','🎡',true,5),
('blanks','إملاء الفراغات','Fill in the Blanks','أكمل الكلمات الناقصة','Fill in the missing words','📝',true,6),
('coming-soon','قريباً','Coming Soon','المزيد من القوالب قريباً','More templates coming soon','➕',false,7);

-- storage buckets
insert into storage.buckets (id,name,public) values ('game-files','game-files',true);
insert into storage.buckets (id,name,public) values ('thumbnails','thumbnails',true);

create policy "Game files public read" on storage.objects for select using (bucket_id='game-files');
create policy "Users upload own game files" on storage.objects for insert with check (bucket_id='game-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own game files" on storage.objects for update using (bucket_id='game-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own game files" on storage.objects for delete using (bucket_id='game-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Thumbnails public read" on storage.objects for select using (bucket_id='thumbnails');
create policy "Users upload own thumbnails" on storage.objects for insert with check (bucket_id='thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own thumbnails" on storage.objects for update using (bucket_id='thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own thumbnails" on storage.objects for delete using (bucket_id='thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);
