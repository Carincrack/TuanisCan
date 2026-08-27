-- Datos complementarios del perfil y del carné de cada mascota.
alter table public.mascotas
  add column if not exists veterinaria varchar(150),
  add column if not exists notas text;

-- Una vacuna puede registrarla el dueño sin asociarla a un negocio de la plataforma.
alter table public.historial_vacunas
  alter column id_negocio drop not null,
  add column if not exists veterinaria varchar(150),
  add column if not exists lote varchar(80),
  add column if not exists notas text;

-- Fotos privadas: cada usuario solo administra los archivos de su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mascotas',
  'mascotas',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "usuarios_select_own_pet_photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'mascotas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios_insert_own_pet_photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mascotas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios_update_own_pet_photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'mascotas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'mascotas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios_delete_own_pet_photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mascotas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
