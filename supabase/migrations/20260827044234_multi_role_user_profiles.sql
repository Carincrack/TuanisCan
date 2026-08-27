-- Sistema de perfiles funcionales multiples.
-- Admin sigue viviendo en auth.users.app_metadata.app_role.

create table public.roles (
    id_rol smallint generated always as identity primary key,
    nombre text not null unique
        check (nombre in ('dueno', 'paseador', 'negocio'))
);

insert into public.roles (nombre)
values ('dueno'), ('paseador'), ('negocio')
on conflict (nombre) do nothing;

create table public.usuario_roles (
    id_usuario uuid not null
        references public.usuarios(id_usuario)
        on delete cascade,
    id_rol smallint not null
        references public.roles(id_rol)
        on delete restrict,
    fecha_asignacion timestamptz not null default now(),
    primary key (id_usuario, id_rol)
);

create index usuario_roles_id_rol_idx
    on public.usuario_roles(id_rol);

insert into public.usuario_roles (id_usuario, id_rol)
select u.id_usuario, r.id_rol
from public.usuarios u
inner join public.roles r
    on r.nombre = u.tipo_usuario::text
where u.tipo_usuario::text in ('dueno', 'paseador', 'negocio')
on conflict do nothing;

insert into public.paseadores (id_usuario)
select u.id_usuario
from public.usuarios u
where u.tipo_usuario = 'paseador'
on conflict (id_usuario) do nothing;

alter table public.roles enable row level security;
alter table public.usuario_roles enable row level security;

revoke all on public.roles from public;
revoke all on public.usuario_roles from public;

grant select on public.roles to authenticated;
grant select on public.usuario_roles to authenticated;

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "usuario_roles_select_own"
on public.usuario_roles
for select
to authenticated
using ((select auth.uid()) = id_usuario);

create policy "admin_select_all_usuario_roles"
on public.usuario_roles
for select
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);

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
        from public.usuario_roles ur
        inner join public.roles r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = p_id_usuario
          and r.nombre = p_rol
    );
$$;

revoke all
on function public.usuario_tiene_rol(uuid, text)
from public;

grant execute
on function public.usuario_tiene_rol(uuid, text)
to authenticated;

create or replace function public.protect_usuario_system_fields()
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

    if new.id_usuario is distinct from old.id_usuario then
        raise exception 'No se puede modificar id_usuario';
    end if;

    if new.fecha_registro is distinct from old.fecha_registro then
        raise exception 'No se puede modificar fecha_registro';
    end if;

    if not is_admin and new.activo is distinct from old.activo then
        raise exception 'No tiene permiso para modificar activo';
    end if;

    return new;
end;
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

    if v_rol = 'paseador' then
        insert into public.paseadores (id_usuario)
        values (v_usuario_id)
        on conflict (id_usuario) do nothing;
    end if;

    return (
        select coalesce(array_agg(r.nombre order by r.id_rol), array[]::text[])
        from public.usuario_roles ur
        inner join public.roles r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = v_usuario_id
    );
end;
$$;

revoke all
on function public.agregar_rol_a_mi_cuenta(text)
from public;

grant execute
on function public.agregar_rol_a_mi_cuenta(text)
to authenticated;

create or replace function public.obtener_mis_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(r.nombre order by r.id_rol), array[]::text[])
    from public.usuario_roles ur
    inner join public.roles r
        on r.id_rol = ur.id_rol
    where ur.id_usuario = auth.uid();
$$;

revoke all
on function public.obtener_mis_roles()
from public;

grant execute
on function public.obtener_mis_roles()
to authenticated;

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
        'roles', coalesce(roles.roles, '[]'::jsonb),
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
        select jsonb_agg(r.nombre order by r.id_rol) as roles
        from public.usuario_roles ur
        inner join public.roles r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles on true
    where u.id_usuario = auth.uid();
$$;

revoke all
on function public.obtener_mi_perfil()
from public;

grant execute
on function public.obtener_mi_perfil()
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
        insert into public.usuario_roles (id_usuario, id_rol)
        select new.id, r.id_rol
        from public.roles r
        where r.nombre = v_rol
        on conflict do nothing;
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

create or replace function public.buscar_paseadores(
    p_zona_id uuid default null,
    p_solo_disponibles boolean default true,
    p_calificacion_min numeric default null
)
returns table (
    id_usuario uuid,
    nombre text,
    foto_perfil text,
    zona_id uuid,
    descripcion text,
    tarifa_base numeric,
    calificacion_promedio numeric,
    disponible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        u.id_usuario,
        u.nombre::text,
        u.foto_perfil,
        u.zona_id,
        p.descripcion,
        p.tarifa_base,
        p.calificacion_promedio,
        p.disponible
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    where
        p.estado_verificacion = 'aprobado'
        and u.activo = true
        and public.usuario_tiene_rol(u.id_usuario, 'paseador')
        and (
            p_zona_id is null
            or u.zona_id = p_zona_id
        )
        and (
            p_solo_disponibles = false
            or p.disponible = true
        )
        and (
            p_calificacion_min is null
            or p.calificacion_promedio >= p_calificacion_min
        )
    order by
        p.calificacion_promedio desc,
        p.tarifa_base asc nulls last;
$$;

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

alter table public.usuarios
    drop column tipo_usuario;

drop type if exists public.tipo_usuario;
