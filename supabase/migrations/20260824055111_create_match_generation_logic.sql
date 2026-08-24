-- ============================================================
-- PUNTAJE DE MATCH: 0 - 100
-- ============================================================

alter table public.matches
add constraint matches_puntaje_coincidencia_check
check (
    puntaje_coincidencia >= 0
    and puntaje_coincidencia <= 100
);


-- ============================================================
-- FUNCIÓN INTERNA: GENERAR MATCHES PARA UN REPORTE
-- ============================================================

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
        mp.id_reporte,
        mp.id_mascota,
        mp.zona_id,
        mp.estado,
        mp.especie,
        mp.descripcion
    into v_reporte
    from public.mascotas_perdidas mp
    where mp.id_reporte = p_id_reporte;


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
        v_reporte.id_reporte,
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


-- Esta función es interna.
revoke all
on function public.generar_matches_reporte(uuid)
from public;


-- ============================================================
-- TRIGGER: GENERAR MATCHES AL CREAR REPORTE
-- ============================================================

create or replace function public.handle_generar_matches_reporte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    perform public.generar_matches_reporte(
        new.id_reporte
    );

    return new;

end;
$$;


create trigger generar_matches_al_reportar_mascota
after insert on public.mascotas_perdidas
for each row
execute function public.handle_generar_matches_reporte();