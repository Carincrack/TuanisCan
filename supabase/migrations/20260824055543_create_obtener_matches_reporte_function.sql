-- ============================================================
-- RPC: OBTENER MATCHES DE UN REPORTE
-- ============================================================

create or replace function public.obtener_matches_reporte(
    p_id_reporte uuid
)
returns table (
    id_match uuid,
    id_mascota uuid,
    nombre text,
    especie text,
    raza text,
    sexo text,
    color text,
    foto text,
    puntaje_coincidencia numeric,
    estado public.estado_match,
    fecha_match timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;


    v_is_admin := coalesce(
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
        false
    );


    -- Solo puede consultar:
    -- 1. quien creó el reporte
    -- 2. un administrador

    if not v_is_admin
       and not exists (
            select 1
            from public.mascotas_perdidas mp
            where mp.id_reporte = p_id_reporte
              and mp.id_usuario_reporta = v_usuario_id
       ) then

        raise exception
            'No tiene permisos para consultar los matches de este reporte';

    end if;


    return query

    select
        mt.id_match,
        m.id_mascota,
        m.nombre::text,
        m.especie::text,
        m.raza::text,
        m.sexo::text,
        m.color::text,
        m.foto,
        mt.puntaje_coincidencia,
        mt.estado,
        mt.fecha_match

    from public.matches mt

    inner join public.mascotas m
        on m.id_mascota = mt.id_mascota

    where mt.id_reporte = p_id_reporte

    order by
        mt.puntaje_coincidencia desc,
        mt.fecha_match desc;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.obtener_matches_reporte(uuid)
from public;


grant execute
on function public.obtener_matches_reporte(uuid)
to authenticated;