-- La migracion de pais (20261007072442) reemplazo obtener_mi_perfil()
-- copiando una version anterior a la verificacion de cuenta y se
-- perdieron estado_verificacion/observacion/fechas. El frontend
-- recibia undefined y mostraba "sin_solicitud" aunque la cuenta ya
-- estuviera aprobada en la tabla usuarios.

create or replace function public.obtener_mi_perfil()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'usuario',
        case
            when u.id_usuario is null then null
            else jsonb_build_object(
                'id_usuario', u.id_usuario,
                'nombre', coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario'),
                'telefono', pu.telefono,
                'foto_perfil', pu.foto_perfil,
                'pais', coalesce(pu.pais, 'CR'),
                'zona_id', pu.zona_id,
                'fecha_registro', u.fecha_registro,
                'activo', u.activo,
                'estado_verificacion', u.estado_verificacion,
                'observacion_verificacion', u.observacion_verificacion,
                'fecha_solicitud_verificacion', u.fecha_solicitud_verificacion,
                'fecha_revision_verificacion', u.fecha_revision_verificacion
            )
        end,
        'roles', coalesce(roles_agg.roles, '[]'::jsonb),
        'is_admin', coalesce(
            ((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin',
            false
        )
    )
    from public.usuarios u
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join lateral (
        select jsonb_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    where u.id_usuario = auth.uid();
$$;

revoke all on function public.obtener_mi_perfil() from public;
grant execute on function public.obtener_mi_perfil() to authenticated;
