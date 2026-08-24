-- ============================================================
-- CREAR NEGOCIO PARA EL USUARIO AUTENTICADO
-- ============================================================

create or replace function public.crear_negocio(
    p_nombre text,
    p_tipo public.tipo_negocio,
    p_zona_id uuid default null,
    p_direccion text default null,
    p_latitud numeric default null,
    p_longitud numeric default null,
    p_telefono text default null,
    p_horario text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_negocio_id uuid;
begin
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    -- Solo una cuenta registrada como negocio puede crear negocios.
    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and tipo_usuario = 'negocio'
          and activo = true
    ) then
        raise exception 'El usuario no tiene permisos para crear un negocio';
    end if;

    if p_nombre is null or trim(p_nombre) = '' then
        raise exception 'El nombre del negocio es obligatorio';
    end if;

    if p_latitud is not null
       and (p_latitud < -90 or p_latitud > 90) then
        raise exception 'Latitud inválida';
    end if;

    if p_longitud is not null
       and (p_longitud < -180 or p_longitud > 180) then
        raise exception 'Longitud inválida';
    end if;

    insert into public.negocios (
        id_propietario,
        zona_id,
        nombre,
        tipo,
        direccion,
        latitud,
        longitud,
        telefono,
        horario
    )
    values (
        v_usuario_id,
        p_zona_id,
        trim(p_nombre),
        p_tipo,
        p_direccion,
        p_latitud,
        p_longitud,
        p_telefono,
        p_horario
    )
    returning id_negocio
    into v_negocio_id;

    return v_negocio_id;
end;
$$;


revoke all
on function public.crear_negocio(
    text,
    public.tipo_negocio,
    uuid,
    text,
    numeric,
    numeric,
    text,
    text
)
from public;


grant execute
on function public.crear_negocio(
    text,
    public.tipo_negocio,
    uuid,
    text,
    numeric,
    numeric,
    text,
    text
)
to authenticated;