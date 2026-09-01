-- Normalizacion de cuentas y datos personales.
--
-- public.usuarios queda como espejo de autenticacion/estado.
-- public.perfil_usuario guarda datos personales comunes.
-- public.duenos formaliza la relacion de propietario para mascotas y paseos.

create table if not exists public.perfil_usuario (
    id_usuario uuid primary key
        references public.usuarios(id_usuario)
        on delete cascade,
    nombre varchar(150) not null,
    telefono varchar(20),
    foto_perfil text,
    zona_id uuid
        references public.zonas(id_zona)
        on delete set null
);

comment on table public.perfil_usuario is
    'Datos personales del usuario. No contiene credenciales ni estado de cuenta.';

create index if not exists perfil_usuario_zona_id_idx
    on public.perfil_usuario(zona_id);

insert into public.perfil_usuario (
    id_usuario,
    nombre,
    telefono,
    foto_perfil,
    zona_id
)
select
    u.id_usuario,
    coalesce(nullif(trim(u.nombre), ''), nullif(split_part(u.correo, '@', 1), ''), 'Usuario'),
    u.telefono,
    u.foto_perfil,
    u.zona_id
from public.usuarios u
on conflict (id_usuario) do update
set
    nombre = excluded.nombre,
    telefono = excluded.telefono,
    foto_perfil = excluded.foto_perfil,
    zona_id = excluded.zona_id;

create table if not exists public.duenos (
    id_usuario uuid primary key
        references public.usuarios(id_usuario)
        on delete cascade,
    fecha_alta timestamptz not null default now()
);

comment on table public.duenos is
    'Perfil funcional de duenno de mascotas. La identidad vive en usuarios/perfil_usuario.';

insert into public.duenos (id_usuario)
select ur.id_usuario
from public.usuario_rol ur
inner join public.rol r
    on r.id_rol = ur.id_rol
where r.nombre::text = 'dueno'
on conflict do nothing;

insert into public.duenos (id_usuario)
select distinct m.id_dueno
from public.mascotas m
inner join public.usuarios u
    on u.id_usuario = m.id_dueno
where m.id_dueno is not null
on conflict do nothing;

insert into public.duenos (id_usuario)
select distinct p.id_dueno
from public.paseos p
inner join public.usuarios u
    on u.id_usuario = p.id_dueno
where p.id_dueno is not null
on conflict do nothing;

alter table public.perfil_usuario enable row level security;
alter table public.duenos enable row level security;

revoke all on public.perfil_usuario from public;
revoke all on public.duenos from public;

grant select, insert, update on public.perfil_usuario to authenticated;
grant select on public.duenos to authenticated;

drop policy if exists "perfil_usuario_select_own" on public.perfil_usuario;
create policy "perfil_usuario_select_own"
on public.perfil_usuario
for select
to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_perfil_usuario" on public.perfil_usuario;
create policy "admin_select_all_perfil_usuario"
on public.perfil_usuario
for select
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "perfil_usuario_insert_own" on public.perfil_usuario;
create policy "perfil_usuario_insert_own"
on public.perfil_usuario
for insert
to authenticated
with check (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "perfil_usuario_update_own" on public.perfil_usuario;
create policy "perfil_usuario_update_own"
on public.perfil_usuario
for update
to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
)
with check (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "admin_update_all_perfil_usuario" on public.perfil_usuario;
create policy "admin_update_all_perfil_usuario"
on public.perfil_usuario
for update
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
)
with check (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "duenos_select_own" on public.duenos;
create policy "duenos_select_own"
on public.duenos
for select
to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_duenos" on public.duenos;
create policy "admin_select_all_duenos"
on public.duenos
for select
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

alter table public.mascotas
    drop constraint if exists mascotas_id_dueno_fkey;

alter table public.mascotas
    add constraint mascotas_id_dueno_fkey
    foreign key (id_dueno)
    references public.duenos(id_usuario)
    on delete cascade;

alter table public.paseos
    drop constraint if exists paseos_id_dueno_fkey;

alter table public.paseos
    add constraint paseos_id_dueno_fkey
    foreign key (id_dueno)
    references public.duenos(id_usuario)
    on delete cascade;

drop policy if exists "usuarios_update_own" on public.usuarios;

drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own"
on public.usuarios
for select
to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_all_usuarios" on public.usuarios;
create policy "admin_select_all_usuarios"
on public.usuarios
for select
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "admin_update_all_usuarios" on public.usuarios;
create policy "admin_update_all_usuarios"
on public.usuarios
for update
to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
)
with check (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

create or replace function public.protect_usuario_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    is_admin boolean;
begin
    is_admin := public.es_admin_actual()
        or coalesce((select auth.role()) = 'service_role', false);

    if new.id_usuario is distinct from old.id_usuario then
        raise exception 'No se puede modificar id_usuario';
    end if;

    if new.fecha_registro is distinct from old.fecha_registro then
        raise exception 'No se puede modificar fecha_registro';
    end if;

    if not is_admin and new.correo is distinct from old.correo then
        raise exception 'No tiene permiso para modificar correo';
    end if;

    if not is_admin and new.activo is distinct from old.activo then
        raise exception 'No tiene permiso para modificar activo';
    end if;

    return new;
end;
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
                'nombre', coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario'),
                'telefono', pu.telefono,
                'foto_perfil', pu.foto_perfil,
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

    if not public.usuario_actual_activo() then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    select id_rol
    into v_rol_id
    from public.rol
    where nombre::text = v_rol;

    insert into public.usuario_rol (id_usuario, id_rol)
    values (v_usuario_id, v_rol_id)
    on conflict do nothing;

    if v_rol = 'dueno' then
        insert into public.duenos (id_usuario)
        values (v_usuario_id)
        on conflict do nothing;
    end if;

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

    if not public.usuario_actual_activo() then
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
        id_usuario,
        nombre,
        telefono,
        foto_perfil,
        zona_id
    )
    values (
        new.id,
        v_nombre,
        v_telefono,
        v_foto_perfil,
        v_zona_id
    )
    on conflict (id_usuario) do update
    set
        nombre = excluded.nombre,
        telefono = excluded.telefono,
        foto_perfil = excluded.foto_perfil,
        zona_id = excluded.zona_id;

    foreach v_rol in array v_roles loop
        -- Admin es privilegio de Auth, no perfil funcional.
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
        insert into public.paseadores (
            id_usuario,
            descripcion,
            tarifa_base,
            disponible
        )
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

create or replace function public.listar_usuarios_admin()
returns table (
    id_usuario uuid,
    correo text,
    nombre text,
    telefono text,
    foto_perfil text,
    fecha_registro timestamptz,
    activo boolean,
    zona_nombre text,
    zona_canton text,
    zona_provincia text,
    roles text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.es_admin_actual() or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para consultar usuarios';
    end if;

    return query
    select
        u.id_usuario,
        u.correo::text,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        pu.telefono::text,
        pu.foto_perfil,
        u.fecha_registro,
        u.activo,
        z.nombre::text,
        z.canton::text,
        z.provincia::text,
        coalesce(roles_agg.roles, array[]::text[])
    from public.usuarios u
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join public.zonas z
        on z.id_zona = pu.zona_id
    left join lateral (
        select array_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r
            on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    order by u.fecha_registro desc;
end;
$$;

revoke all on function public.listar_usuarios_admin() from public;
grant execute on function public.listar_usuarios_admin() to authenticated;

create or replace function public.listar_paseadores_admin()
returns table (
    id_usuario uuid,
    nombre text,
    foto_perfil text,
    zona text,
    paseos bigint,
    rating numeric,
    generado numeric,
    estado text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.es_admin_actual() or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para consultar paseadores';
    end if;

    return query
    select
        u.id_usuario,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        pu.foto_perfil,
        coalesce(z.nombre, 'Sin zona')::text as zona,
        count(pa.id_paseo)::bigint as paseos,
        p.calificacion_promedio::numeric as rating,
        coalesce(
            sum(
                case
                    when pa.estado = 'finalizado' then pa.precio
                    else 0
                end
            ),
            0
        )::numeric as generado,
        case
            when p.estado_verificacion = 'rechazado' then 'suspendido'
            when u.activo = false or p.estado_verificacion = 'pendiente' then 'inactivo'
            else 'activo'
        end::text as estado
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join public.zonas z
        on z.id_zona = pu.zona_id
    left join public.paseos pa
        on pa.id_paseador = p.id_usuario
    group by
        u.id_usuario,
        u.correo,
        pu.nombre,
        pu.foto_perfil,
        z.nombre,
        u.activo,
        p.estado_verificacion,
        p.calificacion_promedio
    order by
        u.activo desc,
        p.estado_verificacion,
        count(pa.id_paseo) desc,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario');
end;
$$;

revoke all on function public.listar_paseadores_admin() from public;
grant execute on function public.listar_paseadores_admin() to authenticated;

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
    zona text,
    descripcion text,
    tarifa_base numeric,
    calificacion_promedio numeric,
    disponible boolean,
    total_resenas bigint,
    total_paseos bigint
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        u.id_usuario,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        pu.foto_perfil,
        pu.zona_id,
        coalesce(z.nombre, 'Sin zona')::text as zona,
        p.descripcion,
        p.tarifa_base,
        p.calificacion_promedio,
        p.disponible,
        count(distinct r.id_resena)::bigint as total_resenas,
        count(distinct pa.id_paseo)::bigint as total_paseos
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    left join public.zonas z
        on z.id_zona = pu.zona_id
    left join public.resenas r
        on r.id_receptor = p.id_usuario
    left join public.paseos pa
        on pa.id_paseador = p.id_usuario
       and pa.estado = 'finalizado'
    where
        p.estado_verificacion = 'aprobado'
        and u.activo = true
        and public.usuario_tiene_rol(u.id_usuario, 'paseador')
        and (
            p_zona_id is null
            or pu.zona_id = p_zona_id
        )
        and (
            p_solo_disponibles = false
            or p.disponible = true
        )
        and (
            p_calificacion_min is null
            or p.calificacion_promedio >= p_calificacion_min
        )
    group by
        u.id_usuario,
        u.correo,
        pu.nombre,
        pu.foto_perfil,
        pu.zona_id,
        z.nombre,
        p.descripcion,
        p.tarifa_base,
        p.calificacion_promedio,
        p.disponible
    order by
        p.calificacion_promedio desc,
        p.tarifa_base asc nulls last,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario');
$$;

revoke all on function public.buscar_paseadores(uuid, boolean, numeric) from public;
grant execute on function public.buscar_paseadores(uuid, boolean, numeric) to authenticated;

create or replace function public.solicitar_paseo(
    p_id_mascota uuid,
    p_id_paseador uuid,
    p_fecha date,
    p_hora_inicio time,
    p_duracion_min integer,
    p_direccion_encuentro text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid := auth.uid();
    v_zona_id uuid;
    v_precio numeric;
    v_paseo_id uuid;
begin
    if v_dueno_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    if not exists (
        select 1
        from public.duenos
        where id_usuario = v_dueno_id
    ) then
        raise exception 'Tu cuenta no tiene perfil de duenno';
    end if;

    if p_fecha < current_date then
        raise exception 'La fecha del paseo no puede estar en el pasado';
    end if;

    if p_duracion_min not in (30, 45, 60, 90) then
        raise exception 'Duracion no permitida';
    end if;

    if p_direccion_encuentro is null or length(trim(p_direccion_encuentro)) < 8 then
        raise exception 'Indica una direccion de encuentro valida';
    end if;

    if not exists (
        select 1
        from public.mascotas
        where id_mascota = p_id_mascota
          and id_dueno = v_dueno_id
    ) then
        raise exception 'La mascota no pertenece a tu cuenta';
    end if;

    select pu.zona_id, p.tarifa_base
    into v_zona_id, v_precio
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu
        on pu.id_usuario = u.id_usuario
    where p.id_usuario = p_id_paseador
      and p.estado_verificacion = 'aprobado'
      and p.disponible = true
      and u.activo = true
      and public.usuario_tiene_rol(u.id_usuario, 'paseador');

    if v_precio is null then
        raise exception 'El paseador no esta disponible para solicitudes';
    end if;

    insert into public.paseos (
        id_mascota,
        id_dueno,
        id_paseador,
        zona_id,
        fecha,
        hora_inicio,
        duracion_min,
        precio,
        direccion_encuentro
    )
    values (
        p_id_mascota,
        v_dueno_id,
        p_id_paseador,
        v_zona_id,
        p_fecha,
        p_hora_inicio,
        p_duracion_min,
        v_precio,
        trim(p_direccion_encuentro)
    )
    returning id_paseo into v_paseo_id;

    return v_paseo_id;
end;
$$;

revoke all on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) from public;
grant execute on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) to authenticated;

alter table public.usuarios
    drop column if exists nombre,
    drop column if exists telefono,
    drop column if exists foto_perfil,
    drop column if exists zona_id,
    drop column if exists contrasena_hash;

comment on table public.usuarios is
    'Cuenta de aplicacion ligada a Supabase Auth. Solo contiene identidad de autenticacion, correo sincronizado, fecha y estado.';
