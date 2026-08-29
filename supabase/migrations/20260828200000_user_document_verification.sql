-- Verificacion documental de cuentas y bloqueo de operaciones hasta aprobacion.

do $$
begin
    if not exists (
        select 1 from pg_type
        where typnamespace = 'public'::regnamespace
          and typname = 'estado_verificacion_usuario'
    ) then
        create type public.estado_verificacion_usuario as enum (
            'sin_solicitud',
            'pendiente',
            'aprobado',
            'rechazado'
        );
    end if;
end $$;

alter table public.usuarios
    add column if not exists estado_verificacion public.estado_verificacion_usuario
        not null default 'sin_solicitud',
    add column if not exists observacion_verificacion text,
    add column if not exists fecha_solicitud_verificacion timestamptz,
    add column if not exists fecha_revision_verificacion timestamptz,
    add column if not exists revisado_por uuid
        references public.usuarios(id_usuario)
        on delete set null;

create table if not exists public.documentos_verificacion_usuario (
    id_documento uuid primary key default gen_random_uuid(),
    id_usuario uuid not null
        references public.usuarios(id_usuario)
        on delete cascade,
    tipo_documento text not null check (
        tipo_documento in (
            'cedula_frente',
            'cedula_reverso',
            'hoja_delincuencia',
            'permiso_funcionamiento'
        )
    ),
    nombre_archivo text not null,
    ruta_storage text not null,
    fecha_subida timestamptz not null default now(),
    unique (id_usuario, tipo_documento),
    check (split_part(ruta_storage, '/', 1) = id_usuario::text)
);

alter table public.documentos_verificacion_usuario enable row level security;

revoke all on public.documentos_verificacion_usuario from public;
grant select, insert, update, delete
on public.documentos_verificacion_usuario to authenticated;

create or replace function public.puede_editar_documentos_verificacion()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.usuarios u
        where u.id_usuario = auth.uid()
          and u.activo = true
          and u.estado_verificacion in ('sin_solicitud', 'rechazado')
    );
$$;

revoke all on function public.puede_editar_documentos_verificacion() from public;
grant execute on function public.puede_editar_documentos_verificacion() to authenticated;

drop policy if exists "documentos_verificacion_select_own" on public.documentos_verificacion_usuario;
create policy "documentos_verificacion_select_own"
on public.documentos_verificacion_usuario
for select to authenticated
using (
    id_usuario = (select auth.uid())
    and public.usuario_actual_activo()
);

drop policy if exists "admin_select_documentos_verificacion" on public.documentos_verificacion_usuario;
create policy "admin_select_documentos_verificacion"
on public.documentos_verificacion_usuario
for select to authenticated
using (
    public.es_admin_actual()
    and public.usuario_actual_activo()
);

drop policy if exists "documentos_verificacion_insert_own" on public.documentos_verificacion_usuario;
create policy "documentos_verificacion_insert_own"
on public.documentos_verificacion_usuario
for insert to authenticated
with check (
    id_usuario = (select auth.uid())
    and public.puede_editar_documentos_verificacion()
);

drop policy if exists "documentos_verificacion_update_own" on public.documentos_verificacion_usuario;
create policy "documentos_verificacion_update_own"
on public.documentos_verificacion_usuario
for update to authenticated
using (
    id_usuario = (select auth.uid())
    and public.puede_editar_documentos_verificacion()
)
with check (
    id_usuario = (select auth.uid())
    and public.puede_editar_documentos_verificacion()
);

drop policy if exists "documentos_verificacion_delete_own" on public.documentos_verificacion_usuario;
create policy "documentos_verificacion_delete_own"
on public.documentos_verificacion_usuario
for delete to authenticated
using (
    id_usuario = (select auth.uid())
    and public.puede_editar_documentos_verificacion()
);

insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
values (
    'usuarios-verificacion',
    'usuarios-verificacion',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "usuarios_upload_verification_documents" on storage.objects;
create policy "usuarios_upload_verification_documents"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'usuarios-verificacion'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.puede_editar_documentos_verificacion()
);

drop policy if exists "usuarios_select_verification_documents" on storage.objects;
create policy "usuarios_select_verification_documents"
on storage.objects for select to authenticated
using (
    bucket_id = 'usuarios-verificacion'
    and (
        (
            (storage.foldername(name))[1] = (select auth.uid()::text)
            and public.usuario_actual_activo()
        )
        or (
            public.es_admin_actual()
            and public.usuario_actual_activo()
        )
    )
);

drop policy if exists "usuarios_delete_verification_documents" on storage.objects;
create policy "usuarios_delete_verification_documents"
on storage.objects for delete to authenticated
using (
    bucket_id = 'usuarios-verificacion'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.puede_editar_documentos_verificacion()
);

create or replace function public.enviar_solicitud_verificacion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_faltantes text[] := array[]::text[];
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    if exists (
        select 1 from public.usuarios
        where id_usuario = v_usuario_id
          and estado_verificacion in ('pendiente', 'aprobado')
    ) then
        raise exception 'La solicitud ya fue enviada o aprobada';
    end if;

    if not exists (
        select 1 from public.documentos_verificacion_usuario
        where id_usuario = v_usuario_id and tipo_documento = 'cedula_frente'
    ) then
        v_faltantes := array_append(v_faltantes, 'cedula por el frente');
    end if;

    if not exists (
        select 1 from public.documentos_verificacion_usuario
        where id_usuario = v_usuario_id and tipo_documento = 'cedula_reverso'
    ) then
        v_faltantes := array_append(v_faltantes, 'cedula por el reverso');
    end if;

    if exists (
        select 1 from public.paseadores where id_usuario = v_usuario_id
    ) and not exists (
        select 1 from public.documentos_verificacion_usuario
        where id_usuario = v_usuario_id and tipo_documento = 'hoja_delincuencia'
    ) then
        v_faltantes := array_append(v_faltantes, 'hoja de delincuencia');
    end if;

    if exists (
        select 1 from public.negocios where id_usuario = v_usuario_id
    ) and not exists (
        select 1 from public.documentos_verificacion_usuario
        where id_usuario = v_usuario_id and tipo_documento = 'permiso_funcionamiento'
    ) then
        v_faltantes := array_append(v_faltantes, 'permiso de funcionamiento');
    end if;

    if cardinality(v_faltantes) > 0 then
        raise exception 'Faltan documentos: %', array_to_string(v_faltantes, ', ');
    end if;

    update public.usuarios
    set estado_verificacion = 'pendiente',
        observacion_verificacion = null,
        fecha_solicitud_verificacion = now(),
        fecha_revision_verificacion = null,
        revisado_por = null
    where id_usuario = v_usuario_id;
end;
$$;

revoke all on function public.enviar_solicitud_verificacion() from public;
grant execute on function public.enviar_solicitud_verificacion() to authenticated;

create or replace function public.listar_verificaciones_admin()
returns table (
    id_usuario uuid,
    nombre text,
    correo text,
    foto_perfil text,
    zona text,
    roles text[],
    fecha_solicitud timestamptz,
    documentos jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null
       or not public.es_admin_actual()
       or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para consultar verificaciones';
    end if;

    return query
    select
        u.id_usuario,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario')::text,
        u.correo::text,
        pu.foto_perfil,
        coalesce(z.nombre, 'Sin zona')::text,
        coalesce(roles_agg.roles, array[]::text[]),
        u.fecha_solicitud_verificacion,
        coalesce(documentos_agg.documentos, '[]'::jsonb)
    from public.usuarios u
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    left join public.zonas z on z.id_zona = pu.zona_id
    left join lateral (
        select array_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'id_documento', d.id_documento,
                'tipo_documento', d.tipo_documento,
                'nombre_archivo', d.nombre_archivo,
                'ruta_storage', d.ruta_storage,
                'fecha_subida', d.fecha_subida
            ) order by d.fecha_subida
        ) as documentos
        from public.documentos_verificacion_usuario d
        where d.id_usuario = u.id_usuario
    ) documentos_agg on true
    where u.estado_verificacion = 'pendiente'
      and u.activo = true
    order by u.fecha_solicitud_verificacion;
end;
$$;

revoke all on function public.listar_verificaciones_admin() from public;
grant execute on function public.listar_verificaciones_admin() to authenticated;

create or replace function public.revisar_verificacion_usuario(
    p_id_usuario uuid,
    p_estado text,
    p_observacion text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_rol_paseador smallint;
begin
    if auth.uid() is null
       or not public.es_admin_actual()
       or not public.usuario_actual_activo() then
        raise exception 'No tiene permisos para revisar verificaciones';
    end if;

    if p_estado not in ('aprobado', 'rechazado') then
        raise exception 'Estado de verificacion no permitido';
    end if;

    if p_estado = 'rechazado'
       and coalesce(length(trim(p_observacion)), 0) < 5 then
        raise exception 'Indique una observacion de al menos 5 caracteres';
    end if;

    if not exists (
        select 1 from public.usuarios
        where id_usuario = p_id_usuario
          and estado_verificacion = 'pendiente'
    ) then
        raise exception 'La solicitud no existe o ya fue revisada';
    end if;

    if p_estado = 'aprobado' and (
        not exists (
            select 1 from public.documentos_verificacion_usuario
            where id_usuario = p_id_usuario and tipo_documento = 'cedula_frente'
        )
        or not exists (
            select 1 from public.documentos_verificacion_usuario
            where id_usuario = p_id_usuario and tipo_documento = 'cedula_reverso'
        )
        or (
            exists (select 1 from public.paseadores where id_usuario = p_id_usuario)
            and not exists (
                select 1 from public.documentos_verificacion_usuario
                where id_usuario = p_id_usuario and tipo_documento = 'hoja_delincuencia'
            )
        )
        or (
            exists (select 1 from public.negocios where id_usuario = p_id_usuario)
            and not exists (
                select 1 from public.documentos_verificacion_usuario
                where id_usuario = p_id_usuario and tipo_documento = 'permiso_funcionamiento'
            )
        )
    ) then
        raise exception 'La solicitud no contiene todos los documentos requeridos';
    end if;

    update public.usuarios
    set estado_verificacion = p_estado::public.estado_verificacion_usuario,
        observacion_verificacion = case
            when p_estado = 'rechazado' then trim(p_observacion)
            else null
        end,
        fecha_revision_verificacion = now(),
        revisado_por = auth.uid()
    where id_usuario = p_id_usuario;

    if p_estado = 'aprobado' and exists (
        select 1 from public.paseadores where id_usuario = p_id_usuario
    ) then
        update public.paseadores
        set estado_verificacion = 'aprobado'
        where id_usuario = p_id_usuario;

        select id_rol into v_rol_paseador
        from public.rol
        where nombre::text = 'paseador';

        insert into public.usuario_rol (id_usuario, id_rol)
        values (p_id_usuario, v_rol_paseador)
        on conflict do nothing;
    end if;
end;
$$;

revoke all on function public.revisar_verificacion_usuario(uuid, text, text) from public;
grant execute on function public.revisar_verificacion_usuario(uuid, text, text) to authenticated;

create or replace function public.usuario_actual_verificado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.es_admin_actual() or exists (
        select 1
        from public.usuarios u
        where u.id_usuario = auth.uid()
          and u.activo = true
          and u.estado_verificacion = 'aprobado'
    );
$$;

revoke all on function public.usuario_actual_verificado() from public;
grant execute on function public.usuario_actual_verificado() to authenticated;

create or replace function public.exigir_usuario_verificado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if coalesce((select auth.role()) = 'service_role', false)
       or public.es_admin_actual() then
        if tg_op = 'DELETE' then return old; end if;
        return new;
    end if;

    if auth.uid() is null or not public.usuario_actual_verificado() then
        raise exception 'Debe verificar su perfil antes de realizar esta accion';
    end if;

    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

do $$
declare
    v_tabla text;
begin
    foreach v_tabla in array array[
        'mascotas',
        'paseos',
        'mascotas_perdidas',
        'historial_vacunas',
        'avistamientos',
        'matches',
        'ubicaciones_paseo',
        'paseador_zonas',
        'pagos',
        'resenas',
        'notificaciones',
        'mensajes'
    ] loop
        if to_regclass('public.' || v_tabla) is not null then
            execute format(
                'drop trigger if exists exigir_usuario_verificado on public.%I',
                v_tabla
            );
            execute format(
                'create trigger exigir_usuario_verificado before insert or update or delete on public.%I for each row execute function public.exigir_usuario_verificado()',
                v_tabla
            );
        end if;
    end loop;
end $$;

create or replace function public.invalidar_verificacion_por_nuevo_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() = new.id_usuario
       and not public.es_admin_actual() then
        update public.usuarios
        set estado_verificacion = 'sin_solicitud',
            observacion_verificacion = null,
            fecha_solicitud_verificacion = null,
            fecha_revision_verificacion = null,
            revisado_por = null
        where id_usuario = new.id_usuario
          and estado_verificacion in ('aprobado', 'pendiente');
    end if;
    return new;
end;
$$;

drop trigger if exists invalidar_verificacion_por_nuevo_perfil on public.paseadores;
create trigger invalidar_verificacion_por_nuevo_perfil
after insert on public.paseadores
for each row execute function public.invalidar_verificacion_por_nuevo_perfil();

drop trigger if exists invalidar_verificacion_por_nuevo_perfil on public.negocios;
create trigger invalidar_verificacion_por_nuevo_perfil
after insert on public.negocios
for each row execute function public.invalidar_verificacion_por_nuevo_perfil();

-- El directorio solo publica negocios verificados; el propietario y admin
-- conservan acceso para completar y revisar sus propios datos.
drop policy if exists "negocios_select_authenticated" on public.negocios;
create policy "negocios_select_authenticated"
on public.negocios
for select to authenticated
using (
    id_usuario = (select auth.uid())
    or public.es_admin_actual()
    or exists (
        select 1 from public.usuarios u
        where u.id_usuario = negocios.id_usuario
          and u.activo = true
          and u.estado_verificacion = 'aprobado'
    )
);

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
        count(distinct r.id_resena)::bigint,
        count(distinct pa.id_paseo)::bigint
    from public.paseadores p
    inner join public.usuarios u on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    left join public.zonas z on z.id_zona = pu.zona_id
    left join public.resenas r on r.id_receptor = p.id_usuario
    left join public.paseos pa
        on pa.id_paseador = p.id_usuario
       and pa.estado = 'finalizado'
    where p.estado_verificacion = 'aprobado'
      and u.estado_verificacion = 'aprobado'
      and u.activo = true
      and public.usuario_tiene_rol(u.id_usuario, 'paseador')
      and (p_zona_id is null or pu.zona_id = p_zona_id)
      and (p_solo_disponibles = false or p.disponible = true)
      and (p_calificacion_min is null or p.calificacion_promedio >= p_calificacion_min)
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

create or replace function public.validar_paseador_verificado_en_paseo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.id_paseador is not null and not exists (
        select 1
        from public.usuarios u
        inner join public.paseadores p on p.id_usuario = u.id_usuario
        where u.id_usuario = new.id_paseador
          and u.activo = true
          and u.estado_verificacion = 'aprobado'
          and p.estado_verificacion = 'aprobado'
    ) then
        raise exception 'El paseador no tiene un perfil verificado';
    end if;
    return new;
end;
$$;

drop trigger if exists validar_paseador_verificado_en_paseo on public.paseos;
create trigger validar_paseador_verificado_en_paseo
before insert or update of id_paseador on public.paseos
for each row execute function public.validar_paseador_verificado_en_paseo();

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
                'activo', u.activo,
                'estado_verificacion', u.estado_verificacion,
                'observacion_verificacion', u.observacion_verificacion,
                'fecha_solicitud_verificacion', u.fecha_solicitud_verificacion,
                'fecha_revision_verificacion', u.fecha_revision_verificacion
            )
        end,
        'roles', coalesce(roles_agg.roles, '[]'::jsonb),
        'is_admin', coalesce(
            ((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin',
            false
        )
    )
    from public.usuarios u
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    left join lateral (
        select jsonb_agg(r.nombre::text order by r.id_rol) as roles
        from public.usuario_rol ur
        inner join public.rol r on r.id_rol = ur.id_rol
        where ur.id_usuario = u.id_usuario
    ) roles_agg on true
    where u.id_usuario = auth.uid();
$$;
