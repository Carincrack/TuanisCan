-- Paseadores activos para dueños y solicitud segura de paseos.

drop function if exists public.buscar_paseadores(uuid, boolean, numeric);

create function public.buscar_paseadores(
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
        u.nombre::text,
        u.foto_perfil,
        u.zona_id,
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
    left join public.zonas z
        on z.id_zona = u.zona_id
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
    group by
        u.id_usuario,
        u.nombre,
        u.foto_perfil,
        u.zona_id,
        z.nombre,
        p.descripcion,
        p.tarifa_base,
        p.calificacion_promedio,
        p.disponible
    order by
        p.calificacion_promedio desc,
        p.tarifa_base asc nulls last,
        u.nombre;
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

    select u.zona_id, p.tarifa_base
    into v_zona_id, v_precio
    from public.paseadores p
    inner join public.usuarios u
        on u.id_usuario = p.id_usuario
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
