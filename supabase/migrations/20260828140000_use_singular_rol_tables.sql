-- Las tablas de catalogo pasan a nombre singular: `rol` y `usuario_rol`.
--
-- En el remoto ya se renombraron a mano desde el dashboard; en un entorno
-- limpio (`supabase db reset`) llegan en plural desde 20260827044234. El
-- rename de abajo es idempotente para cubrir los dos casos.
--
-- Ademas se hace `create or replace` de las 7 funciones que referenciaban
-- public.roles / public.usuario_roles, con los nombres nuevos y con
-- `nombre::text` en las comparaciones (tolera que roles.nombre sea text o el
-- enum public.nombre_rol).
--
-- Politicas RLS, grants, indices y constraints siguen adheridos a la tabla
-- por OID, sobreviven al rename y no se tocan.

-- ---------------------------------------------------------------------------
-- 1. Rename idempotente
-- ---------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.roles') is not null
       and to_regclass('public.rol') is null then
        alter table public.roles rename to rol;
    end if;

    if to_regclass('public.usuario_roles') is not null
       and to_regclass('public.usuario_rol') is null then
        alter table public.usuario_roles rename to usuario_rol;
    end if;
end $$;

-- CHECK de rol.nombre: solo si la columna sigue siendo text (si es el enum
-- public.nombre_rol el conjunto ya esta acotado por el propio tipo).
do $$
declare
    v_type text;
begin
    select udt_name into v_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rol'
      and column_name = 'nombre';

    if v_type = 'text' then
        alter table public.rol drop constraint if exists roles_nombre_check;
        alter table public.rol drop constraint if exists rol_nombre_check;
        alter table public.rol add constraint rol_nombre_check
            check (nombre in ('dueno', 'paseador', 'negocio', 'admin'));
    end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Funciones
-- ---------------------------------------------------------------------------

create or replace function public.usuario_tiene_rol(
    p_id_usuario uuid,
    p_rol text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = p_id_usuario
          and r.nombre::text = p_rol
    );
$$;

create or replace function public.obtener_mis_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(r.nombre::text order by r.id_rol), array[]::text[])
    from public.usuario_rol ur
    inner join public.rol r
        on r.id_rol = ur.id_rol
    where ur.id_usuario = auth.uid();
$$;

create or replace function public.obtener_mi_perfil()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'usuario',
        case
            when u.id_usuario is null then null
            else jsonb_build_object(
                'id_usuario', u.id_usuario,
                'nombre', u.nombre,
                'telefono', u.telefono,
                'foto_perfil', u.foto_perfil,
                'zona_id', u.zona_id,
                'fecha_registro', u.fecha_registro,
                'activo', u.activo
            )
        end,
        'roles', coalesce(roles_agg.roles, '[]'::jsonb),
        'is_admin', coalesce(
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin',
            false
        )
    )
    from public.usuarios u
    left join lateral (
        select jsonb_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    where u.id_usuario = auth.uid();
$$;

create or replace function public.agregar_rol_a_mi_cuenta(p_rol text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_rol text := lower(trim(p_rol));
    v_rol_id smallint;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if v_rol not in ('dueno', 'paseador', 'negocio') then
        raise exception 'Rol no permitido';
    end if;

    if v_rol = 'paseador' then
        raise exception 'El perfil de paseador requiere solicitud y aprobacion administrativa';
    end if;

    if not exists (
        select 1
        from public.usuarios
        where id_usuario = v_usuario_id
          and activo = true
    ) then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    select id_rol
    into v_rol_id
    from public.rol
    where nombre::text = v_rol;

    insert into public.usuario_rol (id_usuario, id_rol)
    values (v_usuario_id, v_rol_id)
    on conflict do nothing;

    return (
        select coalesce(array_agg(r.nombre::text order by r.id_rol), array[]::text[])
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = v_usuario_id
    );
end;
$$;

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

create or replace function public.verificar_paseador(
    p_id_usuario uuid,
    p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_rol_id smallint;
begin
    v_is_admin := coalesce(
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
        false
    );

    if not v_is_admin then
        raise exception 'No tiene permisos para verificar paseadores';
    end if;

    if p_estado not in ('aprobado', 'rechazado') then
        raise exception 'Estado de verificacion no permitido';
    end if;

    if not exists (
        select 1
        from public.paseadores
        where id_usuario = p_id_usuario
    ) then
        raise exception 'El paseador no existe';
    end if;

    update public.paseadores
    set estado_verificacion =
        p_estado::public.estado_verificacion_paseador
    where id_usuario = p_id_usuario;

    select id_rol
    into v_rol_id
    from public.rol
    where nombre::text = 'paseador';

    if p_estado = 'aprobado' then
        insert into public.usuario_rol (id_usuario, id_rol)
        values (p_id_usuario, v_rol_id)
        on conflict do nothing;
    else
        delete from public.usuario_rol
        where id_usuario = p_id_usuario
          and id_rol = v_rol_id;
    end if;
end;
$$;

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
