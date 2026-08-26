-- Guarda en una sola transaccion los datos enviados por el registro por pasos.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre text := trim(new.raw_user_meta_data ->> 'nombre');
    v_telefono text := nullif(trim(new.raw_user_meta_data ->> 'telefono'), '');
    v_tipo_usuario text := new.raw_user_meta_data ->> 'tipo_usuario';
    v_foto_perfil text := nullif(trim(new.raw_user_meta_data ->> 'foto_perfil'), '');
    v_zona_id uuid;
    v_nombre_negocio text := nullif(trim(new.raw_user_meta_data ->> 'nombre_negocio'), '');
    v_tipo_negocio text := new.raw_user_meta_data ->> 'tipo_negocio';
begin
    if v_nombre is null or v_nombre = '' then
        raise exception 'El nombre es obligatorio';
    end if;

    if v_tipo_usuario is null
       or v_tipo_usuario not in ('dueno', 'paseador', 'negocio') then
        raise exception 'Tipo de usuario no permitido';
    end if;

    if nullif(new.raw_user_meta_data ->> 'zona_id', '') is not null then
        v_zona_id := (new.raw_user_meta_data ->> 'zona_id')::uuid;
    end if;

    insert into public.usuarios (
        id_usuario, nombre, telefono, tipo_usuario, foto_perfil, zona_id
    ) values (
        new.id, v_nombre, v_telefono, v_tipo_usuario::public.tipo_usuario,
        v_foto_perfil, v_zona_id
    );

    if v_tipo_usuario = 'paseador' then
        insert into public.paseadores (
            id_usuario, descripcion, tarifa_base, disponible
        ) values (
            new.id,
            nullif(trim(new.raw_user_meta_data ->> 'descripcion'), ''),
            nullif(new.raw_user_meta_data ->> 'tarifa_base', '')::numeric,
            coalesce((new.raw_user_meta_data ->> 'disponible')::boolean, false)
        );
    elsif v_tipo_usuario = 'negocio' then
        if v_nombre_negocio is null
           or v_tipo_negocio not in ('veterinaria', 'tienda', 'refugio') then
            raise exception 'Los datos del negocio son obligatorios';
        end if;

        insert into public.negocios (
            id_propietario, zona_id, nombre, tipo, direccion,
            latitud, longitud, telefono, horario
        ) values (
            new.id,
            v_zona_id,
            v_nombre_negocio,
            v_tipo_negocio::public.tipo_negocio,
            nullif(trim(new.raw_user_meta_data ->> 'direccion'), ''),
            nullif(new.raw_user_meta_data ->> 'latitud', '')::numeric,
            nullif(new.raw_user_meta_data ->> 'longitud', '')::numeric,
            v_telefono,
            nullif(trim(new.raw_user_meta_data ->> 'horario'), '')
        );
    end if;

    return new;
end;
$$;
