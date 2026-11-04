-- Las coincidencias solo comparaban la zona del reporte de "encontré
-- esta mascota" contra la zona del PERFIL del dueño candidato (dónde
-- vive esa persona). Si la mascota se perdió lejos de la zona donde
-- vive su dueño y alguien la encuentra ahí, las dos zonas nunca
-- coinciden y el candidato correcto nunca aparece, aunque sí haya un
-- reporte de "se me perdió" para esa misma mascota en esa zona.
--
-- Ahora la condición de zona es un OR entre las dos:
--   · la zona del perfil del dueño candidato (como ya estaba), o
--   · la zona de un reporte "perdida" activo para esa misma mascota
--     (el que generó `id_mascota` al reportarla).
--
-- Nada más cambia: el puntaje, el filtro de especie, el `on conflict`
-- y el resto de la función siguen igual.

create or replace function public.generar_matches_reporte(p_id_reporte uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reporte record;
    v_insertados integer;
begin

    select
        mp.id_mascota_perdida,
        mp.id_mascota,
        mp.zona_id,
        mp.estado,
        mp.especie,
        mp.descripcion
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
