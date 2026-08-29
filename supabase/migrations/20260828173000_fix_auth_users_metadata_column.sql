-- auth.users no expone `app_metadata` como columna; la columna real es
-- `raw_app_meta_data`. El JWT si mantiene la clave `app_metadata`.

drop function if exists public.cambiar_estado_usuario(uuid, boolean);

create function public.cambiar_estado_usuario(
    p_id_usuario uuid,
    p_activo boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
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

    select id_usuario
    into v_usuario_id
    from public.usuarios
    where id_usuario = p_id_usuario
    for update;

    if v_usuario_id is null then
        raise exception 'El usuario no existe';
    end if;

    if p_activo = false and p_id_usuario = auth.uid() then
        raise exception 'No puedes inactivar tu propia cuenta administradora';
    end if;

    if p_activo = false and exists (
        select 1
        from auth.users au
        where au.id = p_id_usuario
          and au.raw_app_meta_data ->> 'app_role' = 'admin'
    ) then
        select count(*)
        into v_admins_activos
        from public.usuarios u
        inner join auth.users au
            on au.id = u.id_usuario
        where u.activo = true
          and au.raw_app_meta_data ->> 'app_role' = 'admin';

        if v_admins_activos <= 1 then
            raise exception 'No se puede inactivar al ultimo administrador activo';
        end if;
    end if;

    update public.usuarios
    set activo = p_activo
    where id_usuario = p_id_usuario;
end;
$$;

revoke all on function public.cambiar_estado_usuario(uuid, boolean) from public;
grant execute on function public.cambiar_estado_usuario(uuid, boolean) to authenticated;
