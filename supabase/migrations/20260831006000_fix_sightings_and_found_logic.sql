alter table public.avistamientos
add column if not exists zona_id uuid,
add column if not exists direccion text,
add column if not exists contacto text;

alter table public.avistamientos
drop constraint if exists avistamientos_zona_id_fkey,
add constraint avistamientos_zona_id_fkey
    foreign key (zona_id)
    references public.zonas(id_zona)
    on delete set null;

create index if not exists avistamientos_zona_id_idx
on public.avistamientos(zona_id);

create or replace function public.registrar_avistamiento(
    p_id_reporte uuid,
    p_latitud numeric,
    p_longitud numeric,
    p_comentario text default null,
    p_zona_id uuid default null,
    p_direccion text default null,
    p_contacto text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_avistamiento_id uuid;
begin
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and activo = true
    ) then
        raise exception 'Usuario no valido o inactivo';
    end if;

    if not exists (
        select 1
        from public.mascotas_perdidas
        where id_mascota_perdida = p_id_reporte
          and estado = 'perdida'
    ) then
        raise exception 'El reporte no existe o la mascota ya fue encontrada';
    end if;

    if p_zona_id is not null
       and not exists (select 1 from public.zonas where id_zona = p_zona_id) then
        raise exception 'La zona seleccionada no existe';
    end if;

    if p_latitud is null or p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud invalida';
    end if;

    if p_longitud is null or p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud invalida';
    end if;

    insert into public.avistamientos (
        id_reporte,
        id_usuario,
        latitud,
        longitud,
        comentario,
        zona_id,
        direccion,
        contacto
    )
    values (
        p_id_reporte,
        v_usuario_id,
        p_latitud,
        p_longitud,
        nullif(trim(p_comentario), ''),
        p_zona_id,
        nullif(trim(p_direccion), ''),
        nullif(trim(p_contacto), '')
    )
    returning id_avistamiento into v_avistamiento_id;

    return v_avistamiento_id;
end;
$$;

revoke all
on function public.registrar_avistamiento(uuid, numeric, numeric, text, uuid, text, text)
from public;

grant execute
on function public.registrar_avistamiento(uuid, numeric, numeric, text, uuid, text, text)
to authenticated;

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
