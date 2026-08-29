-- Gestion administrativa del estado de cuentas.
-- `usuarios.activo` ya existe; esta migracion agrega la operacion segura.

create index if not exists usuarios_activo_idx
    on public.usuarios(activo);

create or replace function public.es_admin_actual()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        ((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin',
        false
    );
$$;

create or replace function public.usuario_actual_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.usuarios
        where id_usuario = (select auth.uid())
          and activo = true
    );
$$;

revoke all on function public.es_admin_actual() from public;
revoke all on function public.usuario_actual_activo() from public;
grant execute on function public.es_admin_actual() to authenticated;
grant execute on function public.usuario_actual_activo() to authenticated;

drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own"
on public.usuarios
for update
to authenticated
using (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
)
with check (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
    and activo = true
);

drop policy if exists "admin_update_all_usuarios" on public.usuarios;
create policy "admin_update_all_usuarios"
on public.usuarios
for update
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
)
with check (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "usuario_roles_select_own" on public.usuario_rol;
create policy "usuario_roles_select_own"
on public.usuario_rol
for select
to authenticated
using (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_usuario_roles" on public.usuario_rol;
create policy "admin_select_all_usuario_roles"
on public.usuario_rol
for select
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

create or replace function public.obtener_mis_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(r.nombre::text order by r.id_rol), array[]::text[])
    from public.usuario_rol ur
    inner join public.rol r
        on r.id_rol = ur.id_rol
    where ur.id_usuario = auth.uid()
      and public.usuario_actual_activo();
$$;

create or replace function public.cambiar_estado_usuario(
    p_id_usuario uuid,
    p_activo boolean
)
returns public.usuarios
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario public.usuarios%rowtype;
    v_admins_activos integer;
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.es_admin_actual() or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para cambiar el estado de usuarios';
    end if;

    if p_id_usuario is null or p_activo is null then
        raise exception 'Debe indicar usuario y estado';
    end if;

    select *
    into v_usuario
    from public.usuarios
    where id_usuario = p_id_usuario
    for update;

    if not found then
        raise exception 'El usuario no existe';
    end if;

    -- Evita que una sesion admin se cierre su propia puerta accidentalmente.
    if p_activo = false and p_id_usuario = auth.uid() then
        raise exception 'No puedes inactivar tu propia cuenta administradora';
    end if;

    if p_activo = false and exists (
        select 1
        from auth.users au
        where au.id = p_id_usuario
          and au.app_metadata ->> 'app_role' = 'admin'
    ) then
        select count(*)
        into v_admins_activos
        from public.usuarios u
        inner join auth.users au
            on au.id = u.id_usuario
        where u.activo = true
          and au.app_metadata ->> 'app_role' = 'admin';

        if v_admins_activos <= 1 then
            raise exception 'No se puede inactivar al ultimo administrador activo';
        end if;
    end if;

    update public.usuarios
    set activo = p_activo
    where id_usuario = p_id_usuario
    returning *
    into v_usuario;

    return v_usuario;
end;
$$;

revoke all on function public.cambiar_estado_usuario(uuid, boolean) from public;
grant execute on function public.cambiar_estado_usuario(uuid, boolean) to authenticated;

drop policy if exists "Los duenos pueden ver sus mascotas" on public.mascotas;
create policy "Los duenos pueden ver sus mascotas"
on public.mascotas for select to authenticated
using (
    auth.uid() = id_dueno
    and public.usuario_actual_activo()
);

drop policy if exists "Los duenos pueden registrar sus mascotas" on public.mascotas;
create policy "Los duenos pueden registrar sus mascotas"
on public.mascotas for insert to authenticated
with check (
    auth.uid() = id_dueno
    and public.usuario_actual_activo()
);

drop policy if exists "Los duenos pueden actualizar sus mascotas" on public.mascotas;
create policy "Los duenos pueden actualizar sus mascotas"
on public.mascotas for update to authenticated
using (
    auth.uid() = id_dueno
    and public.usuario_actual_activo()
)
with check (
    auth.uid() = id_dueno
    and public.usuario_actual_activo()
);

drop policy if exists "Los duenos pueden eliminar sus mascotas" on public.mascotas;
create policy "Los duenos pueden eliminar sus mascotas"
on public.mascotas for delete to authenticated
using (
    auth.uid() = id_dueno
    and public.usuario_actual_activo()
);

drop policy if exists "Los duenos pueden ver el historial de sus mascotas" on public.historial_vacunas;
create policy "Los duenos pueden ver el historial de sus mascotas"
on public.historial_vacunas for select to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.mascotas
        where mascotas.id_mascota = historial_vacunas.id_mascota
          and mascotas.id_dueno = auth.uid()
    )
);

drop policy if exists "Los negocios pueden ver sus vacunas aplicadas" on public.historial_vacunas;
create policy "Los negocios pueden ver sus vacunas aplicadas"
on public.historial_vacunas for select to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.negocios
        where negocios.id_negocio = historial_vacunas.id_negocio
          and negocios.id_usuario = auth.uid()
    )
);

drop policy if exists "Los duenos pueden registrar vacunas" on public.historial_vacunas;
create policy "Los duenos pueden registrar vacunas"
on public.historial_vacunas for insert to authenticated
with check (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.mascotas
        where mascotas.id_mascota = historial_vacunas.id_mascota
          and mascotas.id_dueno = auth.uid()
    )
);

drop policy if exists "Los negocios pueden registrar vacunas aplicadas" on public.historial_vacunas;
create policy "Los negocios pueden registrar vacunas aplicadas"
on public.historial_vacunas for insert to authenticated
with check (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.negocios
        where negocios.id_negocio = historial_vacunas.id_negocio
          and negocios.id_usuario = auth.uid()
    )
);

drop policy if exists "Los duenos pueden actualizar vacunas" on public.historial_vacunas;
create policy "Los duenos pueden actualizar vacunas"
on public.historial_vacunas for update to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.mascotas
        where mascotas.id_mascota = historial_vacunas.id_mascota
          and mascotas.id_dueno = auth.uid()
    )
)
with check (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.mascotas
        where mascotas.id_mascota = historial_vacunas.id_mascota
          and mascotas.id_dueno = auth.uid()
    )
);

drop policy if exists "Los duenos pueden eliminar vacunas" on public.historial_vacunas;
create policy "Los duenos pueden eliminar vacunas"
on public.historial_vacunas for delete to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1
        from public.mascotas
        where mascotas.id_mascota = historial_vacunas.id_mascota
          and mascotas.id_dueno = auth.uid()
    )
);

drop policy if exists "paseadores_update_own" on public.paseadores;
create policy "paseadores_update_own"
on public.paseadores
for update
to authenticated
using (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
)
with check (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
);

drop policy if exists "negocios_update_own" on public.negocios;
create policy "negocios_update_own"
on public.negocios
for update
to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
)
with check (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "documentos_paseador_select_own" on public.documentos_paseador;
create policy "documentos_paseador_select_own"
on public.documentos_paseador
for select
to authenticated
using (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
);

drop policy if exists "documentos_paseador_insert_own" on public.documentos_paseador;
create policy "documentos_paseador_insert_own"
on public.documentos_paseador
for insert
to authenticated
with check (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
);

drop policy if exists "documentos_paseador_delete_own" on public.documentos_paseador;
create policy "documentos_paseador_delete_own"
on public.documentos_paseador
for delete
to authenticated
using (
    (select auth.uid()) = id_usuario
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_documentos_paseador" on public.documentos_paseador;
create policy "admin_select_all_documentos_paseador"
on public.documentos_paseador
for select
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_insert_own_profile_photos" on storage.objects;
create policy "usuarios_insert_own_profile_photos"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'perfiles'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_update_own_profile_photos" on storage.objects;
create policy "usuarios_update_own_profile_photos"
on storage.objects for update to authenticated
using (
    bucket_id = 'perfiles'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
)
with check (
    bucket_id = 'perfiles'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_delete_own_profile_photos" on storage.objects;
create policy "usuarios_delete_own_profile_photos"
on storage.objects for delete to authenticated
using (
    bucket_id = 'perfiles'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_select_own_pet_photos" on storage.objects;
create policy "usuarios_select_own_pet_photos"
on storage.objects for select to authenticated
using (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_insert_own_pet_photos" on storage.objects;
create policy "usuarios_insert_own_pet_photos"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_update_own_pet_photos" on storage.objects;
create policy "usuarios_update_own_pet_photos"
on storage.objects for update to authenticated
using (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
)
with check (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_delete_own_pet_photos" on storage.objects;
create policy "usuarios_delete_own_pet_photos"
on storage.objects for delete to authenticated
using (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "paseadores_upload_own_documents" on storage.objects;
create policy "paseadores_upload_own_documents"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "paseadores_select_own_documents" on storage.objects;
create policy "paseadores_select_own_documents"
on storage.objects for select to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "paseadores_delete_own_documents" on storage.objects;
create policy "paseadores_delete_own_documents"
on storage.objects for delete to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_paseador_documents" on storage.objects;
create policy "admin_select_all_paseador_documents"
on storage.objects for select to authenticated
using (
    bucket_id = 'paseadores-verificacion'
    and public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_upload_own_mascotas_perdidas" on storage.objects;
create policy "usuarios_upload_own_mascotas_perdidas"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'mascotas-perdidas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);

drop policy if exists "authenticated_select_mascotas_perdidas" on storage.objects;
create policy "authenticated_select_mascotas_perdidas"
on storage.objects for select to authenticated
using (
    bucket_id = 'mascotas-perdidas'
    and public.usuario_actual_activo()
);

drop policy if exists "usuarios_delete_own_mascotas_perdidas" on storage.objects;
create policy "usuarios_delete_own_mascotas_perdidas"
on storage.objects for delete to authenticated
using (
    bucket_id = 'mascotas-perdidas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.usuario_actual_activo()
);
