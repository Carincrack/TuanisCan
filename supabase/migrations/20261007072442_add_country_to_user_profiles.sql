-- País configurable del perfil personal.
-- Esta migración solo queda preparada localmente; no se aplica automáticamente.

alter table public.perfil_usuario
    add column if not exists pais text;

update public.perfil_usuario
set pais = 'CR'
where pais is null or btrim(pais) = '';

alter table public.perfil_usuario
    alter column pais set default 'CR',
    alter column pais set not null;

alter table public.perfil_usuario
    drop constraint if exists perfil_usuario_pais_no_vacio;

alter table public.perfil_usuario
    add constraint perfil_usuario_pais_no_vacio
    check (btrim(pais) <> '');

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
                'nombre', coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario'),
                'telefono', pu.telefono,
                'foto_perfil', pu.foto_perfil,
                'pais', coalesce(pu.pais, 'CR'),
                'zona_id', pu.zona_id,
                'fecha_registro', u.fecha_registro,
                'activo', u.activo
            )
        end,
        'roles', coalesce(roles_agg.roles, '[]'::jsonb),
        'is_admin', coalesce(
            ((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin',
            false
        )
    )
    from public.usuarios u
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join lateral (
        select jsonb_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    where u.id_usuario = auth.uid();
$$;

revoke all on function public.obtener_mi_perfil() from public;
grant execute on function public.obtener_mi_perfil() to authenticated;

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
    v_pais text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'pais'), ''), 'CR');
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
           or roles.nombre not in ('dueno', 'paseador', 'negocio', 'admin')
    ) then
        raise exception 'Rol no permitido';
    end if;

    if nullif(new.raw_user_meta_data ->> 'zona_id', '') is not null then
        v_zona_id := (new.raw_user_meta_data ->> 'zona_id')::uuid;
    end if;

    insert into public.usuarios (id_usuario, correo)
    values (new.id, new.email)
    on conflict (id_usuario) do update
    set correo = excluded.correo;

    insert into public.perfil_usuario (
        id_usuario, nombre, telefono, foto_perfil, pais, zona_id
    )
    values (
        new.id, v_nombre, v_telefono, v_foto_perfil, v_pais, v_zona_id
    )
    on conflict (id_usuario) do update
    set
        nombre = excluded.nombre,
        telefono = excluded.telefono,
        foto_perfil = excluded.foto_perfil,
        pais = excluded.pais,
        zona_id = excluded.zona_id;

    foreach v_rol in array v_roles loop
        if v_rol in ('dueno', 'negocio') then
            insert into public.usuario_rol (id_usuario, id_rol)
            select new.id, r.id_rol
            from public.rol r
            where r.nombre::text = v_rol
            on conflict do nothing;
        end if;
    end loop;

    if 'dueno' = any(v_roles) then
        insert into public.duenos (id_usuario)
        values (new.id)
        on conflict do nothing;
    end if;

    if 'paseador' = any(v_roles) then
        insert into public.paseadores (id_usuario, descripcion, tarifa_base, disponible)
        values (
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
            id_usuario, zona_id, nombre, tipo, direccion, latitud, longitud, telefono, horario
        )
        values (
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

revoke all on function public.handle_new_user() from public;
