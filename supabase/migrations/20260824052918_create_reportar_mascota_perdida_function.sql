-- ============================================================
-- RPC: REPORTAR MASCOTA PERDIDA
-- ============================================================

create or replace function public.reportar_mascota_perdida(
    p_id_mascota uuid,
    p_zona_id uuid,
    p_descripcion text,
    p_foto text,
    p_latitud numeric,
    p_longitud numeric,
    p_recompensa numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_reporte_id uuid;
begin

    -- Usuario autenticado.
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;


    -- Descripción obligatoria.
    if p_descripcion is null
       or trim(p_descripcion) = '' then

        raise exception
            'La descripción es obligatoria';

    end if;


    -- Foto obligatoria.
    if p_foto is null
       or trim(p_foto) = '' then

        raise exception
            'La foto es obligatoria';

    end if;


    -- La imagen debe pertenecer a la carpeta
    -- Storage del usuario autenticado.
    if split_part(p_foto, '/', 1)
       <> v_usuario_id::text then

        raise exception
            'La ruta de la foto no pertenece al usuario';

    end if;


    -- Validación de coordenadas.
    if p_latitud < -90
       or p_latitud > 90 then

        raise exception 'Latitud inválida';

    end if;

    if p_longitud < -180
       or p_longitud > 180 then

        raise exception 'Longitud inválida';

    end if;


    -- Recompensa opcional, pero nunca negativa.
    if p_recompensa is not null
       and p_recompensa < 0 then

        raise exception
            'La recompensa no puede ser negativa';

    end if;


    -- Si se relaciona con una mascota registrada,
    -- esa mascota debe pertenecer al usuario.
    if p_id_mascota is not null then

        if not exists (
            select 1
            from public.mascotas
            where id_mascota = p_id_mascota
              and id_dueno = v_usuario_id
        ) then

            raise exception
                'La mascota no pertenece al usuario';

        end if;

    end if;


    -- Crear el reporte.
    insert into public.mascotas_perdidas (
        id_mascota,
        id_usuario_reporta,
        zona_id,
        descripcion,
        foto,
        latitud,
        longitud,
        recompensa
    )
    values (
        p_id_mascota,
        v_usuario_id,
        p_zona_id,
        trim(p_descripcion),
        p_foto,
        p_latitud,
        p_longitud,
        p_recompensa
    )
    returning id_reporte
    into v_reporte_id;


    return v_reporte_id;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.reportar_mascota_perdida(
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric
)
from public;


grant execute
on function public.reportar_mascota_perdida(
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric
)
to authenticated;