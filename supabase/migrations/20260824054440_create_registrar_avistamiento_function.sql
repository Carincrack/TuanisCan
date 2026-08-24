-- ============================================================
-- RPC: REGISTRAR AVISTAMIENTO
-- ============================================================

create or replace function public.registrar_avistamiento(
    p_id_reporte uuid,
    p_latitud numeric,
    p_longitud numeric,
    p_comentario text default null
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

    -- Usuario autenticado
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;


    -- Debe existir como usuario de la aplicación
    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and activo = true
    ) then
        raise exception 'Usuario no válido o inactivo';
    end if;


    -- El reporte debe existir y seguir activo
    if not exists (
        select 1
        from public.mascotas_perdidas
        where id_reporte = p_id_reporte
          and estado = 'perdida'
    ) then
        raise exception
            'El reporte no existe o la mascota ya fue encontrada';
    end if;


    -- Validar coordenadas
    if p_latitud is null
       or p_latitud < -90
       or p_latitud > 90 then
        raise exception 'Latitud inválida';
    end if;


    if p_longitud is null
       or p_longitud < -180
       or p_longitud > 180 then
        raise exception 'Longitud inválida';
    end if;


    -- Crear avistamiento
    insert into public.avistamientos (
        id_reporte,
        id_usuario,
        latitud,
        longitud,
        comentario
    )
    values (
        p_id_reporte,
        v_usuario_id,
        p_latitud,
        p_longitud,
        nullif(trim(p_comentario), '')
    )
    returning id_avistamiento
    into v_avistamiento_id;


    return v_avistamiento_id;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.registrar_avistamiento(
    uuid,
    numeric,
    numeric,
    text
)
from public;


grant execute
on function public.registrar_avistamiento(
    uuid,
    numeric,
    numeric,
    text
)
to authenticated;