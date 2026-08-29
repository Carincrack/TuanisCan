-- Listado administrativo de paseadores con datos agregados para la vista.

create or replace function public.listar_paseadores_admin()
returns table (
    id_usuario uuid,
    nombre text,
    foto_perfil text,
    zona text,
    paseos bigint,
    rating numeric,
    generado numeric,
    estado text
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
        raise exception 'No tiene permisos para consultar paseadores';
    end if;

    return query
    select
        u.id_usuario,
        u.nombre::text,
        u.foto_perfil,
        coalesce(z.nombre, 'Sin zona')::text as zona,
        count(pa.id_paseo)::bigint as paseos,
        p.calificacion_promedio::numeric as rating,
        coalesce(
            sum(
                case
                    when pa.estado = 'finalizado' then pa.precio
                    else 0
                end
            ),
            0
        )::numeric as generado,
        case
            when p.estado_verificacion = 'rechazado' then 'suspendido'
            when u.activo = false or p.estado_verificacion = 'pendiente' then 'inactivo'
            else 'activo'
        end::text as estado
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    left join public.zonas z
        on z.id_zona = u.zona_id
    left join public.paseos pa
        on pa.id_paseador = p.id_usuario
    group by
        u.id_usuario,
        u.nombre,
        u.foto_perfil,
        z.nombre,
        u.activo,
        p.estado_verificacion,
        p.calificacion_promedio
    order by
        u.activo desc,
        p.estado_verificacion,
        count(pa.id_paseo) desc,
        u.nombre;
end;
$$;

revoke all on function public.listar_paseadores_admin() from public;
grant execute on function public.listar_paseadores_admin() to authenticated;
