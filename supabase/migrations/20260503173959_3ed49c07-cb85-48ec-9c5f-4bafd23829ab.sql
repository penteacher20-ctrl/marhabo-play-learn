
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop policy if exists "Game files public read" on storage.objects;
drop policy if exists "Thumbnails public read" on storage.objects;
