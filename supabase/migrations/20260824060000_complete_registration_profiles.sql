-- Completa el registro público sin exponer claves administrativas.

create or replace function public.set_user_app_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tipo_usuario text;
begin
    v_tipo_usuario := new.raw_user_meta_data ->> 'tipo_usuario';

    if v_tipo_usuario in ('dueno', 'paseador', 'negocio') then
        new.raw_app_meta_data := jsonb_set(
            coalesce(new.raw_app_meta_data, '{}'::jsonb),
            '{app_role}',
            to_jsonb(v_tipo_usuario),
            true
        );
    end if;

    return new;
end;
$$;

drop trigger if exists set_app_role_on_user_created on auth.users;

create trigger set_app_role_on_user_created
before insert on auth.users
for each row
execute function public.set_user_app_role();

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
    v_nombre_negocio text;
    v_tipo_negocio text;
begin
    v_nombre := trim(new.raw_user_meta_data ->> 'nombre');
    v_telefono := nullif(trim(new.raw_user_meta_data ->> 'telefono'), '');
    v_tipo_usuario := new.raw_user_meta_data ->> 'tipo_usuario';
    v_foto_perfil := nullif(trim(new.raw_user_meta_data ->> 'foto_perfil'), '');
    v_nombre_negocio := nullif(trim(new.raw_user_meta_data ->> 'nombre_negocio'), '');
    v_tipo_negocio := new.raw_user_meta_data ->> 'tipo_negocio';

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
    )
    values (
        new.id,
        v_nombre,
        v_telefono,
        v_tipo_usuario::public.tipo_usuario,
        v_foto_perfil,
        v_zona_id
    );

    if v_tipo_usuario = 'paseador' then
        insert into public.paseadores (id_usuario)
        values (new.id);
    elsif v_tipo_usuario = 'negocio' then
        if v_nombre_negocio is null
           or v_tipo_negocio not in ('veterinaria', 'tienda', 'refugio') then
            raise exception 'Los datos del negocio son obligatorios';
        end if;

        insert into public.negocios (
            id_propietario, zona_id, nombre, tipo, telefono
        )
        values (
            new.id,
            v_zona_id,
            v_nombre_negocio,
            v_tipo_negocio::public.tipo_negocio,
            v_telefono
        );
    end if;

    return new;
end;
$$;
