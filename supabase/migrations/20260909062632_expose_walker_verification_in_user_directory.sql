-- El estado del perfil de paseador permite distinguir una solicitud pendiente
-- de una cuenta que realmente no tiene ningun rol ni perfil asociado.
drop function if exists public.listar_usuarios_admin();

create function public.listar_usuarios_admin()
returns table (
    id_usuario uuid,
    correo text,
    nombre text,
    telefono text,
    foto_perfil text,
    fecha_registro timestamptz,
    activo boolean,
    zona_nombre text,
    zona_canton text,
    zona_provincia text,
    roles text[],
    estado_paseador text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.es_admin_actual() or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para consultar usuarios';
    end if;

    return query
    select
        u.id_usuario,
        u.correo::text,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        pu.telefono::text,
        pu.foto_perfil,
        u.fecha_registro,
        u.activo,
        z.nombre::text,
        z.canton::text,
        z.provincia::text,
        case
            when au.raw_app_meta_data ->> 'app_role' = 'admin' then
                array_prepend('admin'::text, coalesce(roles_agg.roles, array[]::text[]))
            else coalesce(roles_agg.roles, array[]::text[])
        end,
        p.estado_verificacion::text
    from public.usuarios u
    left join auth.users au
        on au.id = u.id_usuario
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join public.zonas z
        on z.id_zona = pu.zona_id
    left join public.paseadores p
        on p.id_usuario = u.id_usuario
    left join lateral (
        select array_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    order by u.fecha_registro desc;
end;
$$;

revoke all on function public.listar_usuarios_admin() from public;
grant execute on function public.listar_usuarios_admin() to authenticated;
