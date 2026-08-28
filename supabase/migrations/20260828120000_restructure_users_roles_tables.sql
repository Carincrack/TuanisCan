-- Restructuracion de usuarios / roles / usuario_roles para alinear con el
-- diagrama entidad-relacion.
--
-- Decisiones:
--   * usuarios.correo    -> se agrega y se sincroniza desde auth.users.email.
--   * usuarios.contrasena_hash -> se agrega por requerimiento del diagrama ER.
--     La credencial real la sigue administrando Supabase Auth (auth.users,
--     bcrypt); esta columna queda nullable y la app NO la puebla. No exponerla
--     por la Data API ni escribir hashes de contrasena en ella.
--   * roles.descripcion  -> se agrega y se rellenan las 3 filas existentes.
--     No se agrega la fila 'admin': admin sigue viviendo en
--     auth.users.app_metadata.app_role.
--   * usuario_roles      -> pasa de PK compuesta a PK propia (id_usuario_rol),
--     conservando la unicidad (id_usuario, id_rol).

-- ---------------------------------------------------------------------------
-- 1. usuarios.correo
-- ---------------------------------------------------------------------------
alter table public.usuarios
    add column if not exists correo varchar(255);

-- Backfill desde Supabase Auth.
update public.usuarios u
set correo = au.email
from auth.users au
where au.id = u.id_usuario
  and u.correo is null;

-- Unicidad case-insensitive, tolerando filas historicas sin correo.
create unique index if not exists usuarios_correo_lower_key
    on public.usuarios (lower(correo))
    where correo is not null;

-- Presente por el diagrama ER. Nullable y sin poblar: la contrasena real
-- vive en auth.users. Ver nota de cabecera.
alter table public.usuarios
    add column if not exists contrasena_hash text;

-- ---------------------------------------------------------------------------
-- 2. roles.descripcion
-- ---------------------------------------------------------------------------
alter table public.roles
    add column if not exists descripcion text;

update public.roles set descripcion = 'Dueno de mascota que contrata paseos'
    where nombre = 'dueno' and descripcion is null;
update public.roles set descripcion = 'Paseador de perros verificado por administracion'
    where nombre = 'paseador' and descripcion is null;
update public.roles set descripcion = 'Negocio del directorio (veterinaria, tienda o refugio)'
    where nombre = 'negocio' and descripcion is null;

-- ---------------------------------------------------------------------------
-- 3. usuario_roles: PK propia
-- ---------------------------------------------------------------------------
alter table public.usuario_roles
    add column if not exists id_usuario_rol uuid not null default gen_random_uuid();

alter table public.usuario_roles
    drop constraint if exists usuario_roles_pkey;

alter table public.usuario_roles
    add constraint usuario_roles_pkey primary key (id_usuario_rol);

alter table public.usuario_roles
    add constraint usuario_roles_id_usuario_id_rol_key unique (id_usuario, id_rol);

-- ---------------------------------------------------------------------------
-- 4. Sincronizar correo en el alta de usuarios
--    (misma funcion que 20260827052956, solo agrega la columna correo)
-- ---------------------------------------------------------------------------
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
    v_roles text[];
    v_rol text;
    v_nombre_negocio text := nullif(trim(new.raw_user_meta_data ->> 'nombre_negocio'), '');
    v_tipo_negocio text := new.raw_user_meta_data ->> 'tipo_negocio';
begin
    if v_nombre is null or v_nombre = '' then
        raise exception 'El nombre es obligatorio';
    end if;

    if jsonb_typeof(new.raw_user_meta_data -> 'roles') = 'array' then
        select array_agg(distinct nullif(lower(trim(value)), ''))
        into v_roles
        from jsonb_array_elements_text(new.raw_user_meta_data -> 'roles');
    elsif v_tipo_usuario is not null then
        v_roles := array[nullif(lower(trim(v_tipo_usuario)), '')];
    end if;

    v_roles := coalesce(v_roles, array[]::text[]);

    if array_length(v_roles, 1) is null then
        raise exception 'Debe indicar al menos un rol';
    end if;

    if exists (
        select 1
        from unnest(v_roles) as roles(nombre)
        where roles.nombre is null
           or roles.nombre not in ('dueno', 'paseador', 'negocio')
    ) then
        raise exception 'Rol no permitido';
    end if;

    if nullif(new.raw_user_meta_data ->> 'zona_id', '') is not null then
        v_zona_id := (new.raw_user_meta_data ->> 'zona_id')::uuid;
    end if;

    insert into public.usuarios (
        id_usuario, nombre, correo, telefono, foto_perfil, zona_id
    ) values (
        new.id, v_nombre, new.email, v_telefono, v_foto_perfil, v_zona_id
    );

    foreach v_rol in array v_roles loop
        if v_rol <> 'paseador' then
            insert into public.usuario_roles (id_usuario, id_rol)
            select new.id, r.id_rol
            from public.roles r
            where r.nombre = v_rol
            on conflict do nothing;
        end if;
    end loop;

    if 'paseador' = any(v_roles) then
        insert into public.paseadores (
            id_usuario, descripcion, tarifa_base, disponible
        ) values (
            new.id,
            nullif(trim(new.raw_user_meta_data ->> 'descripcion'), ''),
            nullif(new.raw_user_meta_data ->> 'tarifa_base', '')::numeric,
            coalesce((new.raw_user_meta_data ->> 'disponible')::boolean, false)
        )
        on conflict (id_usuario) do nothing;
    end if;

    if 'negocio' = any(v_roles) and v_nombre_negocio is not null then
        if v_tipo_negocio not in ('veterinaria', 'tienda', 'refugio') then
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

-- Mantener correo sincronizado si el usuario cambia su email en Auth.
create or replace function public.sync_usuario_correo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.usuarios
    set correo = new.email
    where id_usuario = new.id;
    return new;
end;
$$;

drop trigger if exists sync_usuario_correo_on_auth on auth.users;
create trigger sync_usuario_correo_on_auth
    after update of email on auth.users
    for each row
    execute function public.sync_usuario_correo();
