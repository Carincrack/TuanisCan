-- ============================================================
-- ÍNDICE GEOESPACIAL
-- ============================================================

create index mascotas_perdidas_ubicacion_gist_idx
on public.mascotas_perdidas
using gist (
    (
        extensions.ST_SetSRID(
            extensions.ST_MakePoint(
                longitud::double precision,
                latitud::double precision
            ),
            4326
        )::extensions.geography
    )
);


-- ============================================================
-- RPC: BUSCAR MASCOTAS PERDIDAS CERCANAS
-- ============================================================

create or replace function public.buscar_mascotas_perdidas_cercanas(
    p_latitud double precision,
    p_longitud double precision,
    p_radio_km double precision,
    p_zona_id uuid default null
)
returns table (
    id_reporte uuid,
    id_mascota uuid,
    id_usuario_reporta uuid,
    zona_id uuid,
    descripcion text,
    foto text,
    latitud numeric,
    longitud numeric,
    recompensa numeric,
    fecha_reporte timestamptz,
    distancia_km double precision
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


    if p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud inválida';
    end if;


    if p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud inválida';
    end if;


    if p_radio_km is null or p_radio_km <= 0 then
        raise exception
            'El radio debe ser mayor que cero';
    end if;


    return query

    select
        mp.id_reporte,
        mp.id_mascota,
        mp.id_usuario_reporta,
        mp.zona_id,
        mp.descripcion,
        mp.foto,
        mp.latitud,
        mp.longitud,
        mp.recompensa,
        mp.fecha_reporte,

        (
            extensions.ST_Distance(
                extensions.ST_SetSRID(
                    extensions.ST_MakePoint(
                        mp.longitud::double precision,
                        mp.latitud::double precision
                    ),
                    4326
                )::extensions.geography,

                extensions.ST_SetSRID(
                    extensions.ST_MakePoint(
                        p_longitud,
                        p_latitud
                    ),
                    4326
                )::extensions.geography
            ) / 1000.0
        ) as distancia_km

    from public.mascotas_perdidas mp

    where

        -- Solo reportes que siguen activos.
        mp.estado = 'perdida'

        -- Filtro opcional por zona.
        and (
            p_zona_id is null
            or mp.zona_id = p_zona_id
        )

        -- Buscar dentro del radio indicado.
        and extensions.ST_DWithin(
            extensions.ST_SetSRID(
                extensions.ST_MakePoint(
                    mp.longitud::double precision,
                    mp.latitud::double precision
                ),
                4326
            )::extensions.geography,

            extensions.ST_SetSRID(
                extensions.ST_MakePoint(
                    p_longitud,
                    p_latitud
                ),
                4326
            )::extensions.geography,

            p_radio_km * 1000
        )

    order by
        distancia_km asc,
        mp.fecha_reporte desc;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.buscar_mascotas_perdidas_cercanas(
    double precision,
    double precision,
    double precision,
    uuid
)
from public;


grant execute
on function public.buscar_mascotas_perdidas_cercanas(
    double precision,
    double precision,
    double precision,
    uuid
)
to authenticated;