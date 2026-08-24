-- ============================================================
-- RLS: DOCUMENTOS DE VERIFICACIÓN DEL PASEADOR
-- ============================================================

alter table public.documentos_paseador
enable row level security;


-- ============================================================
-- SELECT - PROPIO PASEADOR
-- ============================================================

create policy "documentos_paseador_select_own"
on public.documentos_paseador
for select
to authenticated
using (
    id_usuario = (select auth.uid())
);


-- ============================================================
-- INSERT - PROPIO PASEADOR
-- ============================================================

create policy "documentos_paseador_insert_own"
on public.documentos_paseador
for insert
to authenticated
with check (
    id_usuario = (select auth.uid())

    -- La ruta también debe pertenecer a la carpeta del usuario.
    and split_part(ruta_storage, '/', 1)
        = (select auth.uid()::text)
);


-- ============================================================
-- DELETE - PROPIO PASEADOR
-- ============================================================

create policy "documentos_paseador_delete_own"
on public.documentos_paseador
for delete
to authenticated
using (
    id_usuario = (select auth.uid())
);


-- ============================================================
-- ADMIN - CONSULTAR TODOS
-- ============================================================

create policy "admin_select_all_documentos_paseador"
on public.documentos_paseador
for select
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);