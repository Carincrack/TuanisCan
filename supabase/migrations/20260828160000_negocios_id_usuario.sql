-- negocios.id_propietario -> id_usuario
--
-- La tabla se alinea con la convencion del resto del esquema
-- (paseadores.id_usuario, documentos_paseador.id_usuario, usuario_rol.id_usuario).
--
-- En el remoto la columna ya se renombro a mano desde el dashboard; en un
-- entorno limpio (`supabase db reset`) llega como `id_propietario` desde
-- 20260824044045. El rename de abajo es idempotente para cubrir los dos casos.
--
-- Las politicas RLS (`negocios_update_own`) siguen adheridas a la columna por
-- numero de atributo y se actualizan solas con el rename. Las 4 funciones que
-- todavia escriben `id_propietario` en su cuerpo plpgsql NO se actualizan solas
-- (el cuerpo es texto), asi que se hace `create or replace` de todas.

-- ---------------------------------------------------------------------------
-- 1. Rename idempotente
-- ---------------------------------------------------------------------------
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'negocios'
          and column_name = 'id_propietario'
    )
    and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'negocios'
          and column_name = 'id_usuario'
    ) then
        alter table public.negocios rename column id_propietario to id_usuario;
    end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Proteccion de campos sensibles
-- ---------------------------------------------------------------------------
create or replace function public.protect_negocio_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    is_admin boolean;
begin
    is_admin := coalesce(
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
        false
    );

    if new.id_negocio is distinct from old.id_negocio then
        raise exception 'No se puede modificar id_negocio';
    end if;

    if not is_admin
       and new.id_usuario is distinct from old.id_usuario then
        raise exception 'No tiene permiso para modificar id_usuario';
    end if;

    if not is_admin
       and new.destacado is distinct from old.destacado then
        raise exception 'No tiene permiso para modificar destacado';
    end if;

    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Alta de negocio en el registro
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
            insert into public.usuario_rol (id_usuario, id_rol)
            select new.id, r.id_rol
            from public.rol r
            where r.nombre::text = v_rol
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
            id_usuario, zona_id, nombre, tipo, direccion,
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

-- ---------------------------------------------------------------------------
-- 4. Activar perfil de negocio desde la cuenta
-- ---------------------------------------------------------------------------
create or replace function public.activar_perfil_negocio(
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
    v_usuario_id uuid := auth.uid();
    v_rol_id smallint;
    v_negocio_id uuid;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and activo = true
    ) then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    if p_nombre is null or trim(p_nombre) = '' then
        raise exception 'El nombre del negocio es obligatorio';
    end if;

    if p_direccion is null or trim(p_direccion) = '' then
        raise exception 'La direccion del negocio es obligatoria';
    end if;

    if p_horario is null or trim(p_horario) = '' then
        raise exception 'El horario del negocio es obligatorio';
    end if;

    if p_latitud is not null and (p_latitud < -90 or p_latitud > 90) then
        raise exception 'Latitud invalida';
    end if;

    if p_longitud is not null and (p_longitud < -180 or p_longitud > 180) then
        raise exception 'Longitud invalida';
    end if;

    select id_rol
    into v_rol_id
    from public.rol
    where nombre::text = 'negocio';

    insert into public.usuario_rol (id_usuario, id_rol)
    values (v_usuario_id, v_rol_id)
    on conflict do nothing;

    insert into public.negocios (
        id_usuario,
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
        trim(p_direccion),
        p_latitud,
        p_longitud,
        p_telefono,
        trim(p_horario)
    )
    returning id_negocio
    into v_negocio_id;

    return v_negocio_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. crear_negocio (variante sin validaciones de direccion/horario)
-- ---------------------------------------------------------------------------
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
    v_usuario_id uuid := auth.uid();
    v_negocio_id uuid;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and activo = true
    )
    or not public.usuario_tiene_rol(v_usuario_id, 'negocio') then
        raise exception 'El usuario no tiene permisos para crear un negocio';
    end if;

    if p_nombre is null or trim(p_nombre) = '' then
        raise exception 'El nombre del negocio es obligatorio';
    end if;

    if p_latitud is not null
       and (p_latitud < -90 or p_latitud > 90) then
        raise exception 'Latitud invalida';
    end if;

    if p_longitud is not null
       and (p_longitud < -180 or p_longitud > 180) then
        raise exception 'Longitud invalida';
    end if;

    insert into public.negocios (
        id_usuario,
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
