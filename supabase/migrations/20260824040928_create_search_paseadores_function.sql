-- ============================================================
-- BÚSQUEDA SEGURA DE PASEADORES
-- ============================================================

create or replace function public.buscar_paseadores(
    p_zona_id uuid default null,
    p_solo_disponibles boolean default true,
    p_calificacion_min numeric default null
)
returns table (
    id_usuario uuid,
    nombre text,
    foto_perfil text,
    zona_id uuid,
    descripcion text,
    tarifa_base numeric,
    calificacion_promedio numeric,
    disponible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        u.id_usuario,
        u.nombre::text,
        u.foto_perfil,
        u.zona_id,
        p.descripcion,
        p.tarifa_base,
        p.calificacion_promedio,
        p.disponible
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    where
        p.estado_verificacion = 'aprobado'
        and u.activo = true
        and u.tipo_usuario = 'paseador'
        and (
            p_zona_id is null
            or u.zona_id = p_zona_id
        )
        and (
            p_solo_disponibles = false
            or p.disponible = true
        )
        and (
            p_calificacion_min is null
            or p.calificacion_promedio >= p_calificacion_min
        )
    order by
        p.calificacion_promedio desc,
        p.tarifa_base asc nulls last;
$$;


-- Nadie obtiene acceso implícito.
revoke all
on function public.buscar_paseadores(uuid, boolean, numeric)
from public;


-- Solo usuarios autenticados pueden utilizar la búsqueda.
grant execute
on function public.buscar_paseadores(uuid, boolean, numeric)
to authenticated;