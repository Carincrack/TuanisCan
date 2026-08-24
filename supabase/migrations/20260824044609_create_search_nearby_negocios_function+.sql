-- ============================================================
-- ÍNDICE GEOESPACIAL PARA NEGOCIOS
-- ============================================================

create index negocios_ubicacion_gist_idx
on public.negocios
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
)
where latitud is not null
  and longitud is not null;


-- ============================================================
-- RPC: BUSCAR NEGOCIOS CERCANOS
-- ============================================================

create or replace function public.buscar_negocios_cercanos(
    p_latitud double precision,
    p_longitud double precision,
    p_radio_km double precision,
    p_tipo public.tipo_negocio default null
)
returns table (
    id_negocio uuid,
    nombre varchar,
    tipo public.tipo_negocio,
    zona_id uuid,
    direccion text,
    latitud numeric,
    longitud numeric,
    telefono varchar,
    horario text,
    destacado boolean,
    distancia_km double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    -- Usuario autenticado obligatorio.
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    -- Validar coordenadas.
    if p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud inválida';
    end if;

    if p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud inválida';
    end if;

    -- El radio debe ser positivo.
    if p_radio_km is null or p_radio_km <= 0 then
        raise exception 'El radio de búsqueda debe ser mayor que cero';
    end if;

    return query
    select
        n.id_negocio,
        n.nombre,
        n.tipo,
        n.zona_id,
        n.direccion,
        n.latitud,
        n.longitud,
        n.telefono,
        n.horario,
        n.destacado,

        (
            extensions.ST_Distance(
                extensions.ST_SetSRID(
                    extensions.ST_MakePoint(
                        n.longitud::double precision,
                        n.latitud::double precision
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

    from public.negocios n

    where
        n.latitud is not null
        and n.longitud is not null

        and (
            p_tipo is null
            or n.tipo = p_tipo
        )

        and extensions.ST_DWithin(
            extensions.ST_SetSRID(
                extensions.ST_MakePoint(
                    n.longitud::double precision,
                    n.latitud::double precision
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
        n.destacado desc,
        distancia_km asc;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.buscar_negocios_cercanos(
    double precision,
    double precision,
    double precision,
    public.tipo_negocio
)
from public;


grant execute
on function public.buscar_negocios_cercanos(
    double precision,
    double precision,
    double precision,
    public.tipo_negocio
)
to authenticated;