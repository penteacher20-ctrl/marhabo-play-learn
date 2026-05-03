create policy "Game files public read"
on storage.objects
for select
to public
using (bucket_id = 'game-files');

create policy "Thumbnails public read"
on storage.objects
for select
to public
using (bucket_id = 'thumbnails');