-- Foto del negocio, mostrada en el directorio. Mismo patrón que la
-- foto de perfil: bucket público, propietario administra su carpeta.
alter table public.negocios
  add column if not exists foto text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'negocios',
  'negocios',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "usuarios_insert_own_negocio_photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios_update_own_negocio_photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios_delete_own_negocio_photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
