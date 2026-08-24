-- ============================================================
-- STORAGE: DOCUMENTOS DE VERIFICACIÓN DE PASEADORES
-- Bucket: paseadores-verificacion
-- ============================================================


-- ============================================================
-- INSERT
-- Cada usuario autenticado solo puede subir archivos
-- dentro de una carpeta cuyo nombre sea su propio UUID.
-- ============================================================

create policy "paseadores_upload_own_documents"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1]
        = (select auth.uid()::text)
);


-- ============================================================
-- SELECT
-- Cada usuario puede consultar únicamente sus propios archivos.
-- ============================================================

create policy "paseadores_select_own_documents"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1]
        = (select auth.uid()::text)
);


-- ============================================================
-- DELETE
-- Cada usuario puede eliminar únicamente sus propios archivos.
-- ============================================================

create policy "paseadores_delete_own_documents"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1]
        = (select auth.uid()::text)
);


-- ============================================================
-- ADMIN - SELECT
-- El administrador puede consultar todos los documentos
-- del bucket para realizar la verificación.
-- ============================================================

create policy "admin_select_all_paseador_documents"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and (
        (
            (select auth.jwt())
            -> 'app_metadata'
            ->> 'app_role'
        ) = 'admin'
    )
);