-- `mascotas_perdidas.id_reporte` se renombró a `id_mascota_perdida`
-- (20260828181000_split_account_and_personal_profiles / rename previa),
-- pero `generar_matches_reporte` se quedó apuntando al nombre viejo y
-- el trigger que la dispara nunca sobrevivió esa migración. Resultado:
-- ningún reporte de mascota desconocida generaba coincidencias, y de
-- haberlo intentado la función habría fallado por columna inexistente.
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


    -- Solo generar coincidencias de reportes activos.
    if v_reporte.estado <> 'perdida' then
        return 0;
    end if;


    -- Si el reporte ya está relacionado con una mascota
    -- registrada, su identidad ya es conocida.
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

    where
        u.activo = true

        -- Misma zona para el MVP.
        and u.zona_id = v_reporte.zona_id

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

create or replace function public.handle_generar_matches_reporte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.generar_matches_reporte(new.id_mascota_perdida);
    return new;
end;
$$;

drop trigger if exists generar_matches_al_reportar_mascota on public.mascotas_perdidas;

create trigger generar_matches_al_reportar_mascota
after insert on public.mascotas_perdidas
for each row
execute function public.handle_generar_matches_reporte();

-- Avisa al dueño de la mascota candidata cuando aparece una coincidencia
-- nueva. `ON CONFLICT ... DO UPDATE` en generar_matches_reporte solo
-- reescribe el puntaje de un match pendiente existente, así que esto
-- no reavisa dos veces por el mismo par reporte/mascota.
create or replace function public.notificar_match_generado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid;
    v_mascota text;
begin
    if new.estado <> 'pendiente' then
        return new;
    end if;

    select m.id_dueno, m.nombre
    into v_dueno_id, v_mascota
    from public.mascotas m
    where m.id_mascota = new.id_mascota;

    if v_dueno_id is not null then
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_dueno_id,
            'mascota_perdida',
            'Encontramos un reporte de mascota encontrada que podría coincidir con ' || coalesce(v_mascota, 'tu mascota') || '.',
            new.id_reporte
        );
    end if;

    return new;
end;
$$;

drop trigger if exists notificar_match_generado_insertado on public.matches;

create trigger notificar_match_generado_insertado
after insert on public.matches
for each row
execute function public.notificar_match_generado();
