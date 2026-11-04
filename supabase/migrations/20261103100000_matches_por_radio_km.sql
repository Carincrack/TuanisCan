-- La condición de zona por reporte (la que agregó la migración
-- anterior) compara `zona_id`, que es un distrito del catálogo.
-- Un distrito puede ser grande, o el punto marcado puede quedar
-- justo al otro lado de la frontera de dos distritos vecinos — ahí
-- las zonas nunca coinciden aunque los dos puntos marcados en el
-- mapa (dónde se perdió / dónde se encontró) estén a unos metros.
--
-- Se agrega un tercer OR: además de "misma zona de perfil" o "misma
-- zona de reporte", también cuenta si los dos reportes (el de
-- "encontré esta mascota" y el de "se me perdió" de esa misma
-- mascota) están a 3 km o menos entre sí, usando las coordenadas que
-- ya guarda cada reporte (`latitud`/`longitud`, NOT NULL siempre).
--
-- La comparación de zona sigue ahí tal cual: esto solo AMPLÍA los
-- candidatos que puede encontrar, nunca descarta uno que antes sí
-- aparecía.

create or replace function public.generar_matches_reporte(p_id_reporte uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reporte record;
    v_insertados integer;
    v_radio_km constant numeric := 3;
begin

    select
        mp.id_mascota_perdida,
        mp.id_mascota,
        mp.zona_id,
        mp.estado,
        mp.especie,
        mp.descripcion,
        mp.latitud,
        mp.longitud
    into v_reporte
    from public.mascotas_perdidas mp
    where mp.id_mascota_perdida = p_id_reporte;


    if not found then
        raise exception 'El reporte no existe';
    end if;


    if v_reporte.estado <> 'perdida' then
        return 0;
    end if;


    if v_reporte.id_mascota is not null then
        return 0;
    end if;


    insert into public.matches (
        id_reporte,
        id_mascota,
        puntaje_coincidencia
    )
    select
        v_reporte.id_mascota_perdida,
        m.id_mascota,

        (
            50

            +
            case
                when position(
                    lower(m.raza)
                    in lower(v_reporte.descripcion)
                ) > 0
                then 20
                else 0
            end

            +
            case
                when position(
                    lower(m.color)
                    in lower(v_reporte.descripcion)
                ) > 0
                then 15
                else 0
            end

            +
            case
                when position(
                    lower(m.sexo::text)
                    in lower(v_reporte.descripcion)
                ) > 0
                then 15
                else 0
            end

        )::numeric

    from public.mascotas m

    inner join public.usuarios u
        on u.id_usuario = m.id_dueno

    inner join public.perfil_usuario pu
        on pu.id_usuario = m.id_dueno

    where
        u.activo = true

        and lower(trim(m.especie))
            = lower(trim(v_reporte.especie))

        and (
            pu.zona_id = v_reporte.zona_id

            or exists (
                select 1
                from public.mascotas_perdidas mp_activa
                where mp_activa.id_mascota = m.id_mascota
                  and mp_activa.estado = 'perdida'
                  and mp_activa.zona_id = v_reporte.zona_id
            )

            or exists (
                select 1
                from public.mascotas_perdidas mp_cerca
                where mp_cerca.id_mascota = m.id_mascota
                  and mp_cerca.estado = 'perdida'
                  and (
                      6371 * acos(
                          greatest(-1, least(1,
                              cos(radians(v_reporte.latitud))
                              * cos(radians(mp_cerca.latitud))
                              * cos(radians(mp_cerca.longitud) - radians(v_reporte.longitud))
                              + sin(radians(v_reporte.latitud))
                              * sin(radians(mp_cerca.latitud))
                          ))
                      )
                  ) <= v_radio_km
            )
        )

    on conflict (id_reporte, id_mascota)
    do update
    set puntaje_coincidencia =
        excluded.puntaje_coincidencia
    where public.matches.estado = 'pendiente';


    get diagnostics v_insertados = row_count;

    return v_insertados;

end;
$$;

-- Sin revoke/grant acá a propósito: `create or replace function`
-- conserva los permisos que la función ya tiene (incluye `anon`,
-- además de `authenticated`); tocar los permisos no es parte de lo
-- que se pidió, así que mejor no arriesgarse a angostarlos.
