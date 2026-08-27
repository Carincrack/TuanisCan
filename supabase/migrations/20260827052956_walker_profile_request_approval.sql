-- Solicitud de perfil paseador con aprobacion administrativa.

create or replace function public.solicitar_perfil_paseador(
    p_descripcion text,
    p_tarifa_base numeric,
    p_disponible boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_estado public.estado_verificacion_paseador;
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

    if p_descripcion is null or length(trim(p_descripcion)) < 20 then
        raise exception 'La descripcion debe tener al menos 20 caracteres';
    end if;

    if p_tarifa_base is null or p_tarifa_base <= 0 then
        raise exception 'La tarifa base debe ser mayor a cero';
    end if;

    select estado_verificacion
    into v_estado
    from public.paseadores
    where id_usuario = v_usuario_id;

    if v_estado = 'aprobado' then
        raise exception 'El perfil de paseador ya esta aprobado';
    end if;

    if v_estado = 'rechazado' then
        raise exception 'La solicitud fue rechazada; contacte a administracion';
    end if;

    insert into public.paseadores (
        id_usuario,
        descripcion,
        tarifa_base,
        disponible
    )
    values (
        v_usuario_id,
        trim(p_descripcion),
        p_tarifa_base,
        p_disponible
    )
    on conflict (id_usuario) do update
    set descripcion = excluded.descripcion,
        tarifa_base = excluded.tarifa_base,
        disponible = excluded.disponible;
end;
$$;

revoke all
on function public.solicitar_perfil_paseador(text, numeric, boolean)
from public;

grant execute
on function public.solicitar_perfil_paseador(text, numeric, boolean)
to authenticated;

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
    from public.roles
    where nombre = 'negocio';

    insert into public.usuario_roles (id_usuario, id_rol)
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

revoke all
on function public.activar_perfil_negocio(
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
on function public.activar_perfil_negocio(
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
    from public.roles
    where nombre = v_rol;

    insert into public.usuario_roles (id_usuario, id_rol)
    values (v_usuario_id, v_rol_id)
    on conflict do nothing;

    return (
        select coalesce(array_agg(r.nombre order by r.id_rol), array[]::text[])
        from public.usuario_roles ur
        inner join public.roles r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = v_usuario_id
    );
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
    from public.roles
    where nombre = 'paseador';

    if p_estado = 'aprobado' then
        insert into public.usuario_roles (id_usuario, id_rol)
        values (p_id_usuario, v_rol_id)
        on conflict do nothing;
    else
        delete from public.usuario_roles
        where id_usuario = p_id_usuario
          and id_rol = v_rol_id;
    end if;
end;
$$;

revoke all
on function public.verificar_paseador(uuid, text)
from public;

grant execute
on function public.verificar_paseador(uuid, text)
to authenticated;

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
        id_usuario, nombre, telefono, foto_perfil, zona_id
    ) values (
        new.id, v_nombre, v_telefono, v_foto_perfil, v_zona_id
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
