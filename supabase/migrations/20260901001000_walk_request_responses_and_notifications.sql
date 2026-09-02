alter table public.paseos
    add column if not exists comentario_respuesta text,
    add column if not exists fecha_respuesta timestamptz;

create index if not exists paseos_paseador_estado_fecha_idx
    on public.paseos(id_paseador, estado, fecha, hora_inicio);

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
    v_mascota text;
begin
    if v_dueno_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Usuario no encontrado o inactivo';
    end if;

    if not exists (select 1 from public.duenos where id_usuario = v_dueno_id) then
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

    select nombre
    into v_mascota
    from public.mascotas
    where id_mascota = p_id_mascota
      and id_dueno = v_dueno_id;

    if v_mascota is null then
        raise exception 'La mascota no pertenece a tu cuenta';
    end if;

    select pu.zona_id, p.tarifa_base
    into v_zona_id, v_precio
    from public.paseadores p
    inner join public.usuarios u on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
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

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        p_id_paseador,
        'paseo',
        'Nueva solicitud de paseo para ' || v_mascota || '.',
        v_paseo_id
    );

    return v_paseo_id;
end;
$$;

revoke all on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) from public;
grant execute on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) to authenticated;

create or replace function public.listar_solicitudes_paseador()
returns table (
    id_paseo uuid,
    id_dueno uuid,
    dueno text,
    dueno_foto text,
    id_mascota uuid,
    mascota text,
    raza text,
    especie text,
    foto text,
    zona text,
    fecha date,
    hora_inicio time,
    duracion_min integer,
    direccion_encuentro text,
    precio numeric,
    estado public.estado_paseo,
    comentario_respuesta text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id_paseo,
        p.id_dueno,
        coalesce(nullif(trim(pu.nombre), ''), nullif(split_part(u.correo, '@', 1), ''), 'Dueno')::text as dueno,
        pu.foto_perfil as dueno_foto,
        m.id_mascota,
        m.nombre::text as mascota,
        m.raza::text,
        m.especie::text,
        m.foto,
        coalesce(z.nombre, 'Sin zona')::text as zona,
        p.fecha,
        p.hora_inicio,
        p.duracion_min,
        p.direccion_encuentro,
        p.precio,
        p.estado,
        p.comentario_respuesta
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    inner join public.usuarios u on u.id_usuario = p.id_dueno
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    left join public.zonas z on z.id_zona = p.zona_id
    where p.id_paseador = auth.uid()
      and p.estado = 'solicitado'
    order by p.fecha, p.hora_inicio;
$$;

revoke all on function public.listar_solicitudes_paseador() from public;
grant execute on function public.listar_solicitudes_paseador() to authenticated;

create or replace function public.responder_solicitud_paseo(
    p_id_paseo uuid,
    p_aprobada boolean,
    p_comentario text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid;
    v_mascota text;
    v_comentario text := nullif(trim(coalesce(p_comentario, '')), '');
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if v_comentario is not null and length(v_comentario) > 500 then
        raise exception 'El comentario no puede superar 500 caracteres';
    end if;

    select p.id_dueno, m.nombre
    into v_dueno_id, v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_paseador = auth.uid()
      and p.estado = 'solicitado'
    for update of p;

    if v_dueno_id is null then
        raise exception 'La solicitud no existe o ya fue respondida';
    end if;

    update public.paseos
    set estado = case when p_aprobada then 'confirmado'::public.estado_paseo else 'cancelado'::public.estado_paseo end,
        comentario_respuesta = v_comentario,
        fecha_respuesta = now(),
        hora_fin = case
            when p_aprobada then (hora_inicio + make_interval(mins => duracion_min))::time
            else hora_fin
        end
    where id_paseo = p_id_paseo;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'paseo',
        case
            when p_aprobada then 'Tu solicitud de paseo para ' || v_mascota || ' fue aprobada.'
            else 'Tu solicitud de paseo para ' || v_mascota || ' fue rechazada.'
        end || coalesce(' Comentario: ' || v_comentario, ''),
        p_id_paseo
    );
end;
$$;

revoke all on function public.responder_solicitud_paseo(uuid, boolean, text) from public;
grant execute on function public.responder_solicitud_paseo(uuid, boolean, text) to authenticated;
