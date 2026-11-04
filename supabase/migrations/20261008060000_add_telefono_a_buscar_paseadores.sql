-- El directorio de negocios ya muestra el telefono publicamente
-- (directorio.tsx usa negocio.telefono como link "tel:"); el perfil
-- del paseador en /paseadores no tenia ningun dato de contacto, asi
-- que se agrega el mismo campo con el mismo criterio de visibilidad
-- (solo paseadores aprobados y visibles en el directorio).

-- El cambio de columnas obliga a soltar la funcion antes de recrearla:
-- "cannot change return type of existing function" cuando solo se
-- agrega una columna con CREATE OR REPLACE.
drop function if exists public.buscar_paseadores(uuid, boolean, numeric);

create function public.buscar_paseadores(
    p_zona_id uuid default null,
    p_solo_disponibles boolean default true,
    p_calificacion_min numeric default null
)
returns table (
    id_usuario uuid,
    nombre text,
    foto_perfil text,
    telefono text,
    zona_id uuid,
    zona text,
    descripcion text,
    tarifa_base numeric,
    recargo_nocturno numeric,
    recargo_fin_semana numeric,
    recargo_mismo_dia numeric,
    nocturno_desde time,
    nocturno_hasta time,
    calificacion_promedio numeric,
    disponible boolean,
    total_resenas bigint,
    total_paseos bigint
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        u.id_usuario,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        pu.foto_perfil,
        pu.telefono,
        pu.zona_id,
        coalesce(z.nombre, 'Sin zona')::text as zona,
        p.descripcion, p.tarifa_base,
        p.recargo_nocturno, p.recargo_fin_semana, p.recargo_mismo_dia, p.nocturno_desde, p.nocturno_hasta,
        p.calificacion_promedio, p.disponible,
        count(distinct r.id_resena)::bigint,
        count(distinct pa.id_paseo)::bigint
    from public.paseadores p
    inner join public.usuarios u on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    left join public.zonas z on z.id_zona = pu.zona_id
    left join public.resenas r on r.id_receptor = p.id_usuario
    left join public.paseos pa on pa.id_paseador = p.id_usuario and pa.estado = 'finalizado'
    where p.estado_verificacion = 'aprobado'
      and u.estado_verificacion = 'aprobado'
      and u.activo = true
      and public.usuario_tiene_rol(u.id_usuario, 'paseador')
      and (p_zona_id is null or pu.zona_id = p_zona_id)
      and (p_solo_disponibles = false or p.disponible = true)
      and (p_calificacion_min is null or p.calificacion_promedio >= p_calificacion_min)
    group by u.id_usuario, u.correo, pu.nombre, pu.foto_perfil, pu.telefono, pu.zona_id, z.nombre,
        p.descripcion, p.tarifa_base, p.recargo_nocturno, p.recargo_fin_semana, p.recargo_mismo_dia,
        p.nocturno_desde, p.nocturno_hasta, p.calificacion_promedio, p.disponible
    order by p.calificacion_promedio desc, p.tarifa_base asc nulls last,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario');
$$;

revoke all on function public.buscar_paseadores(uuid, boolean, numeric) from public;
grant execute on function public.buscar_paseadores(uuid, boolean, numeric) to authenticated;
