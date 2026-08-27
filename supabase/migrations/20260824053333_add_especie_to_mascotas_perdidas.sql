-- ============================================================
-- AGREGAR ESPECIE A MASCOTAS PERDIDAS
-- ============================================================

alter table public.mascotas_perdidas
add column especie varchar(50) not null;


-- ============================================================
-- REEMPLAZAR RPC DE PUBLICACIÓN
-- Se elimina la versión anterior para no dejar overloads.
-- ============================================================

drop function if exists public.reportar_mascota_perdida(
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric
);


create or replace function public.reportar_mascota_perdida(
    p_id_mascota uuid,
    p_especie text,
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
    v_especie text;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;


    -- ========================================================
    -- SI ES UNA MASCOTA REGISTRADA
    -- ========================================================

    if p_id_mascota is not null then

        select m.especie
        into v_especie
        from public.mascotas m
        where m.id_mascota = p_id_mascota
          and m.id_dueno = v_usuario_id;

        if v_especie is null then
            raise exception
                'La mascota no existe o no pertenece al usuario';
        end if;

    else

        -- Si no está registrada, el frontend debe indicar especie.
        if p_especie is null
           or trim(p_especie) = '' then

            raise exception
                'La especie es obligatoria';

        end if;

        v_especie := trim(p_especie);

    end if;


    -- ========================================================
    -- VALIDACIONES DEL REPORTE
    -- ========================================================

    if p_descripcion is null
       or trim(p_descripcion) = '' then

        raise exception
            'La descripción es obligatoria';

    end if;


    if p_foto is null
       or trim(p_foto) = '' then

        raise exception
            'La foto es obligatoria';

    end if;


    if split_part(p_foto, '/', 1)
       <> v_usuario_id::text then

        raise exception
            'La ruta de la foto no pertenece al usuario';

    end if;


    if p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud inválida';
    end if;


    if p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud inválida';
    end if;


    if p_recompensa is not null
       and p_recompensa < 0 then

        raise exception
            'La recompensa no puede ser negativa';

    end if;


    -- ========================================================
    -- CREAR REPORTE
    -- ========================================================

    insert into public.mascotas_perdidas (
        id_mascota,
        id_usuario_reporta,
        zona_id,
        especie,
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
        v_especie,
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


revoke all
on function public.reportar_mascota_perdida(
    uuid,
    text,
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
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric
)
to authenticated;