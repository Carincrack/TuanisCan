-- Avisa al dueño del reporte cuando alguien registra un avistamiento de
-- su mascota. Va dentro de `registrar_avistamiento` y no en un trigger
-- aparte: la función ya sabe quién reportó y qué mascota es, y evita
-- una segunda consulta a `mascotas_perdidas` para lo mismo.
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
    v_reporte record;
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

    select id_mascota_perdida, id_usuario_reporta, nombre
    into v_reporte
    from public.mascotas_perdidas
    where id_mascota_perdida = p_id_reporte
      and estado = 'perdida';

    if not found then
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

    -- No te avisamos de tu propio avistamiento.
    if v_reporte.id_usuario_reporta <> v_usuario_id then
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_reporte.id_usuario_reporta,
            'mascota_perdida',
            'Alguien reportó un avistamiento de ' || coalesce(v_reporte.nombre, 'tu mascota') || '.',
            v_reporte.id_mascota_perdida
        );
    end if;

    return v_avistamiento_id;
end;
$$;

revoke all
on function public.registrar_avistamiento(uuid, numeric, numeric, text, uuid, text, text)
from public;

grant execute
on function public.registrar_avistamiento(uuid, numeric, numeric, text, uuid, text, text)
to authenticated;

-- Sobrante de antes de que el reporte aceptara zona/dirección/contacto:
-- dos funciones con el mismo nombre confunden al cliente de PostgREST.
drop function if exists public.registrar_avistamiento(uuid, numeric, numeric, text);
