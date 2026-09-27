-- Segundo bug de la misma familia: `usuarios.zona_id` se movió a
-- `perfil_usuario.zona_id` en la separación de cuenta/perfil personal
-- (20260828181000_split_account_and_personal_profiles) y
-- `generar_matches_reporte` se quedó buscándolo en `usuarios`, donde ya
-- no existe. Sin este arreglo la función truena apenas encuentra un
-- candidato real (columna inexistente), aunque el reporte sí se cree.
create or replace function public.generar_matches_reporte(
    p_id_reporte uuid
)
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

        -- Misma zona para el MVP.
        and pu.zona_id = v_reporte.zona_id

        -- La especie debe coincidir obligatoriamente.
        and lower(trim(m.especie))
            = lower(trim(v_reporte.especie))

    on conflict (id_reporte, id_mascota)
    do update
    set puntaje_coincidencia =
        excluded.puntaje_coincidencia
    where public.matches.estado = 'pendiente';


    get diagnostics v_insertados = row_count;

    return v_insertados;

end;
$$;

revoke all
on function public.generar_matches_reporte(uuid)
from public;
