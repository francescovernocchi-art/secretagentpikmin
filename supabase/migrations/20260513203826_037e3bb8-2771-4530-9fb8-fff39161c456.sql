insert into storage.buckets (id, name, public) values ('captures', 'captures', true) on conflict (id) do nothing;

create policy "captures public read" on storage.objects for select using (bucket_id = 'captures');
create policy "captures public insert" on storage.objects for insert with check (bucket_id = 'captures');
create policy "captures public update" on storage.objects for update using (bucket_id = 'captures');
create policy "captures public delete" on storage.objects for delete using (bucket_id = 'captures');