-- ============================================================
-- STORAGE: FOTOS DE MASCOTAS PERDIDAS
-- Bucket: mascotas-perdidas
-- ============================================================


-- El usuario puede subir archivos únicamente
-- dentro de su propia carpeta UUID.

create policy "usuarios_upload_own_mascotas_perdidas"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'mascotas-perdidas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


-- Todos los usuarios autenticados pueden visualizar
-- las fotografías de reportes del feed.

create policy "authenticated_select_mascotas_perdidas"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'mascotas-perdidas'
);


-- El usuario solamente puede eliminar archivos
-- de su propia carpeta.

create policy "usuarios_delete_own_mascotas_perdidas"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'mascotas-perdidas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);