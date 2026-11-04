-- Hasta ahora el precio de un paseo era, sin excepción, la
-- `tarifa_base` del paseador: pedir 30 minutos o 90 costaba lo mismo,
-- y un paseo a las 5am del mismo día costaba igual que uno programado
-- con una semana de anticipación a media tarde. El formulario incluso
-- tenía una nota aclarando "no cambia con la duración" porque así era.
--
-- Ahora el precio final es la tarifa base (pensada para 45 min)
-- escalada por duración, más recargos modestos y acumulables:
--
--   · Duración: proporcional a los 45 min de referencia.
--   · Horario nocturno/madrugada (antes de las 6:00 o desde las 19:00): +8%.
--   · Fin de semana (sábado o domingo): +12%.
--   · Mismo día: +10%.
--
-- Los recargos se suman entre sí (no se multiplican), así que el peor
-- caso combinado (mismo día, fin de semana, horario nocturno) queda en
-- +30% sobre la tarifa escalada por duración: se nota, pero no es
-- brutal.
create or replace function public.calcular_precio_paseo(
    p_tarifa_base numeric,
    p_fecha date,
    p_hora_inicio time,
    p_duracion_min integer
)
returns numeric
language sql
immutable
set search_path = ''
as $$
    select round(
        p_tarifa_base
        * (p_duracion_min::numeric / 45)
        * (
            1
            + case when p_hora_inicio < '06:00' or p_hora_inicio >= '19:00' then 0.08 else 0 end
            + case when extract(isodow from p_fecha) in (6, 7) then 0.12 else 0 end
            + case when p_fecha = current_date then 0.10 else 0 end
        ),
        2
    );
$$;

revoke all on function public.calcular_precio_paseo(numeric, date, time, integer) from public;
grant execute on function public.calcular_precio_paseo(numeric, date, time, integer) to authenticated, anon;

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
    v_tarifa_base numeric;
    v_precio numeric;
    v_paseo_id uuid;
    v_mascota text;
    v_dueno text;
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

    select m.nombre, coalesce(nullif(trim(pu.nombre), ''), 'Dueno')
    into v_mascota, v_dueno
    from public.mascotas m
    left join public.perfil_usuario pu on pu.id_usuario = m.id_dueno
    where m.id_mascota = p_id_mascota
      and m.id_dueno = v_dueno_id;

    if v_mascota is null then
        raise exception 'La mascota no pertenece a tu cuenta';
    end if;

    select pu.zona_id, p.tarifa_base
    into v_zona_id, v_tarifa_base
    from public.paseadores p
    inner join public.usuarios u on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    where p.id_usuario = p_id_paseador
      and p.estado_verificacion = 'aprobado'
      and p.disponible = true
      and u.activo = true
      and public.usuario_tiene_rol(u.id_usuario, 'paseador');

    if v_tarifa_base is null then
        raise exception 'El paseador no esta disponible para solicitudes';
    end if;

    v_precio := public.calcular_precio_paseo(v_tarifa_base, p_fecha, p_hora_inicio, p_duracion_min);

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
    values
        (
            v_dueno_id,
            'paseo',
            'Solicitud de paseo creada para ' || v_mascota || '. Esta en espera de confirmacion del paseador.',
            v_paseo_id
        ),
        (
            p_id_paseador,
            'paseo',
            'Nueva solicitud de paseo: ' || v_mascota || ' con ' || v_dueno || ', ' || p_duracion_min || ' min el ' || p_fecha || ' a las ' || p_hora_inicio || '. Encuentro: ' || trim(p_direccion_encuentro) || '. Pago: CRC ' || v_precio || '.',
            v_paseo_id
        );

    return v_paseo_id;
end;
$$;

revoke all on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) from public;
grant execute on function public.solicitar_paseo(uuid, uuid, date, time, integer, text) to authenticated;
