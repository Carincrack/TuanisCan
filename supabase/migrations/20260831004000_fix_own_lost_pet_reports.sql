drop trigger if exists generar_matches_al_reportar_mascota on public.mascotas_perdidas;

create or replace function public.protect_mascota_perdida_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_estado_controlado boolean;
begin
    v_is_admin := coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'), false);
    v_estado_controlado := coalesce(current_setting('app.cambio_estado_mascota_perdida', true), 'false') = 'true';

    if new.id_mascota_perdida is distinct from old.id_mascota_perdida then
        raise exception 'No se puede modificar id_mascota_perdida';
    end if;

    if new.id_usuario_reporta is distinct from old.id_usuario_reporta then
        raise exception 'No se puede modificar id_usuario_reporta';
    end if;

    if new.fecha_reporte is distinct from old.fecha_reporte then
        raise exception 'No se puede modificar fecha_reporte';
    end if;

    if new.estado is distinct from old.estado and not v_estado_controlado and not v_is_admin then
        raise exception 'El estado debe modificarse mediante la operacion correspondiente';
    end if;

    if old.estado = 'perdida' and new.estado = 'encontrada' then
        new.fecha_resuelto := now();
    end if;

    return new;
end;
$$;

create or replace function public.marcar_mascota_encontrada(
    p_id_reporte uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
    v_reporte record;
begin
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    v_is_admin := coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'), false);

    select mp.id_mascota_perdida, mp.id_usuario_reporta, mp.estado
    into v_reporte
    from public.mascotas_perdidas mp
    where mp.id_mascota_perdida = p_id_reporte;

    if not found then
        raise exception 'El reporte no existe';
    end if;

    if not v_is_admin and v_reporte.id_usuario_reporta <> v_usuario_id then
        raise exception 'No tiene permisos para cerrar este reporte';
    end if;

    if v_reporte.estado = 'encontrada' then
        raise exception 'La mascota ya esta marcada como encontrada';
    end if;

    perform set_config('app.cambio_estado_mascota_perdida', 'true', true);

    update public.mascotas_perdidas
    set estado = 'encontrada'
    where id_mascota_perdida = p_id_reporte;

    perform set_config('app.cambio_estado_mascota_perdida', 'false', true);
end;
$$;

revoke all on function public.marcar_mascota_encontrada(uuid) from public;
grant execute on function public.marcar_mascota_encontrada(uuid) to authenticated;
