create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre text;
    v_telefono text;
    v_tipo_usuario text;
    v_foto_perfil text;
    v_zona_id uuid;
begin
    v_nombre := trim(new.raw_user_meta_data ->> 'nombre');
    v_telefono := nullif(trim(new.raw_user_meta_data ->> 'telefono'), '');
    v_tipo_usuario := new.raw_user_meta_data ->> 'tipo_usuario';
    v_foto_perfil := nullif(trim(new.raw_user_meta_data ->> 'foto_perfil'), '');

    -- El nombre es obligatorio en public.usuarios.
    if v_nombre is null or v_nombre = '' then
        raise exception 'El nombre es obligatorio';
    end if;

    -- El registro público nunca puede crear administradores.
    if v_tipo_usuario is null
       or v_tipo_usuario not in ('dueno', 'paseador', 'negocio') then
        raise exception 'Tipo de usuario no permitido';
    end if;

    -- zona_id es opcional.
    if nullif(new.raw_user_meta_data ->> 'zona_id', '') is not null then
        v_zona_id := (new.raw_user_meta_data ->> 'zona_id')::uuid;
    else
        v_zona_id := null;
    end if;

    insert into public.usuarios (
        id_usuario,
        nombre,
        telefono,
        tipo_usuario,
        foto_perfil,
        zona_id
    )
    values (
        new.id,
        v_nombre,
        v_telefono,
        v_tipo_usuario::public.tipo_usuario,
        v_foto_perfil,
        v_zona_id
    );

    return new;
end;
$$;


create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();