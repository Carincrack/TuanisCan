-- La verificacion de cuenta solo exige la cedula por el frente.
-- 'cedula_reverso' se mantiene en el check para conservar documentos ya subidos.

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
