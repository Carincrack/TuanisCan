-- Bug real: al confirmar un match, la función vinculaba `id_mascota`
-- al reporte de "encontré esta mascota" pero lo dejaba con
-- `estado = 'perdida'`. Si esa mascota ya tenía su propio reporte
-- activo de "se me perdió" (el caso normal, ya que eso es justo lo
-- que la hace candidata), quedaban DOS filas en estado 'perdida' con
-- el mismo `id_mascota` — y la restricción única
-- `mascotas_perdidas_unica_activa_por_mascota_idx` (un solo reporte
-- activo por mascota) lo rechaza con "duplicate key value".
--
-- El arreglo: al confirmar, el reporte de "encontré" pasa a
-- 'encontrada' en la MISMA actualización que le pone el id_mascota
-- (nunca queda un instante en el estado inconsistente), y además se
-- cierra cualquier otro reporte 'perdida' que ya existiera para esa
-- mascota — el caso se resuelve de los dos lados a la vez, en vez de
-- dejarle al dueño un reporte viejo abierto.
--
-- `fecha_resuelto` lo sigue poniendo solo el trigger
-- `protect_mascota_perdida_system_fields`, como siempre; acá solo se
-- habilita el cambio de estado con el mismo `set_config` que ya usa
-- `marcar_mascota_encontrada`.

create or replace function public.resolver_match(
    p_id_match uuid,
    p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
    v_match record;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    v_is_admin := coalesce(
        (((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'),
        false
    );

    if p_estado not in ('confirmado', 'descartado') then
        raise exception 'Estado de match no permitido';
    end if;

    select
        mt.id_match,
        mt.id_reporte,
        mt.id_mascota,
        mt.estado,
        m.id_dueno
    into v_match
    from public.matches mt
    inner join public.mascotas m
        on m.id_mascota = mt.id_mascota
    where mt.id_match = p_id_match;

    if not found then
        raise exception 'El match no existe';
    end if;

    if not v_is_admin
       and v_match.id_dueno <> v_usuario_id then
        raise exception
            'No tiene permisos para resolver este match';
    end if;

    if v_match.estado <> 'pendiente' then
        raise exception
            'El match ya fue resuelto';
    end if;

    -- Descartar
    if p_estado = 'descartado' then
        update public.matches
        set estado = 'descartado'
        where id_match = p_id_match;
        return;
    end if;

    -- Confirmar
    update public.matches
    set estado = 'confirmado'
    where id_match = p_id_match;

    perform set_config('app.cambio_estado_mascota_perdida', 'true', true);

    -- Vincula la mascota Y cierra el reporte de "encontré" en la
    -- misma actualización: nunca queda, ni por un instante, con
    -- id_mascota puesto y estado todavía en 'perdida'.
    update public.mascotas_perdidas
    set id_mascota = v_match.id_mascota,
        estado = 'encontrada'
    where id_mascota_perdida = v_match.id_reporte;

    -- Si esa misma mascota ya tenía su propio reporte de "se me
    -- perdió" activo, también se cierra: el caso se resuelve de los
    -- dos lados, no solo del lado de quien la encontró.
    update public.mascotas_perdidas
    set estado = 'encontrada'
    where id_mascota = v_match.id_mascota
      and estado = 'perdida'
      and id_mascota_perdida <> v_match.id_reporte;

    perform set_config('app.cambio_estado_mascota_perdida', 'false', true);

    -- Los demás candidatos del mismo reporte dejan de ser válidos.
    update public.matches
    set estado = 'descartado'
    where id_reporte = v_match.id_reporte
      and id_match <> p_id_match
      and estado = 'pendiente';

end;
$$;
