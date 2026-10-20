-- =====================================================================
-- «Hoy» es hoy en Costa Rica, no en UTC
--
-- `current_date` es la fecha del servidor, que está en UTC: seis horas
-- adelante de Costa Rica. Desde las 6 p. m. ya era «mañana», y eso
-- rompía dos cosas:
--
--   · solicitar_paseo rechazaba un paseo para hoy («la fecha no puede
--     estar en el pasado») y el dueño terminaba pidiéndolo para mañana
--     sin querer;
--   · calcular_precio_paseo cobraba el recargo de «mismo día» al paseo
--     de mañana y no al de hoy.
--
-- `hoy_cr()` da la fecha de Costa Rica y las dos la usan. Es lo mismo
-- que ya hace `iniciar_mi_paseo`.
--
-- Aprovechando que `solicitar_paseo` se vuelve a escribir entera, sus
-- avisos dicen los montos como en la app («₡5 867», no «CRC 5867.00»),
-- la fecha y la hora sin segundos, y llevan tildes. Nada más cambia.
--
-- Se puede pegar entera en el SQL Editor y volver a correr sin daño.
-- =====================================================================


-- ── 1. La fecha de hoy en Costa Rica ───────────────────────────────

create or replace function public.hoy_cr()
returns date
language sql
stable
set search_path = ''
as $$
    select (now() at time zone 'America/Costa_Rica')::date;
$$;

revoke all on function public.hoy_cr() from public, anon;
grant execute on function public.hoy_cr() to authenticated;


-- ── 2. El precio: el recargo de mismo día es por el día de acá ─────

create or replace function public.calcular_precio_paseo(
    p_id_paseador uuid,
    p_fecha date,
    p_hora_inicio time without time zone,
    p_duracion_min integer
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
    select round(
        p.tarifa_base
        * (p_duracion_min::numeric / 45)
        * (
            1
            + case when public.es_horario_nocturno(p_hora_inicio, p.nocturno_desde, p.nocturno_hasta) then p.recargo_nocturno / 100 else 0 end
            + case when extract(isodow from p_fecha) in (6, 7) then p.recargo_fin_semana / 100 else 0 end
            + case when p_fecha = public.hoy_cr() then p.recargo_mismo_dia / 100 else 0 end
        ),
        2
    )
    from public.paseadores p
    where p.id_usuario = p_id_paseador;
$$;


-- ── 3. Pedir un paseo para hoy, a cualquier hora del día ───────────

create or replace function public.solicitar_paseo(
    p_id_mascota uuid,
    p_id_paseador uuid,
    p_fecha date,
    p_hora_inicio time without time zone,
    p_duracion_min integer,
    p_direccion_encuentro text,
    p_precio_ofrecido numeric default null::numeric
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
    v_precio_tarifa numeric;
    v_precio numeric;
    v_paseo_id uuid;
    v_mascota text;
    v_dueno text;
    v_cuando text;
begin
    if v_dueno_id is null then raise exception 'Usuario no autenticado'; end if;
    if not public.usuario_actual_activo() then raise exception 'Usuario no encontrado o inactivo'; end if;
    if not exists (select 1 from public.duenos where id_usuario = v_dueno_id) then
        raise exception 'Tu cuenta no tiene perfil de dueño';
    end if;
    if p_fecha < public.hoy_cr() then raise exception 'La fecha del paseo no puede estar en el pasado'; end if;
    if p_duracion_min not in (30, 45, 60, 90) then raise exception 'Duracion no permitida'; end if;
    if p_direccion_encuentro is null or length(trim(p_direccion_encuentro)) < 8 then
        raise exception 'Indica una direccion de encuentro valida';
    end if;

    select m.nombre, coalesce(nullif(trim(pu.nombre), ''), 'Dueño')
    into v_mascota, v_dueno
    from public.mascotas m
    left join public.perfil_usuario pu on pu.id_usuario = m.id_dueno
    where m.id_mascota = p_id_mascota and m.id_dueno = v_dueno_id;
    if v_mascota is null then raise exception 'La mascota no pertenece a tu cuenta'; end if;

    select pu.zona_id, p.tarifa_base into v_zona_id, v_tarifa_base
    from public.paseadores p
    inner join public.usuarios u on u.id_usuario = p.id_usuario
    left join public.perfil_usuario pu on pu.id_usuario = u.id_usuario
    where p.id_usuario = p_id_paseador and p.estado_verificacion = 'aprobado'
      and p.disponible = true and u.activo = true
      and public.usuario_tiene_rol(u.id_usuario, 'paseador');
    if v_tarifa_base is null then raise exception 'El paseador no esta disponible para solicitudes'; end if;

    v_precio_tarifa := public.calcular_precio_paseo(p_id_paseador, p_fecha, p_hora_inicio, p_duracion_min);

    if p_precio_ofrecido is null then
        v_precio := v_precio_tarifa;
    else
        v_precio := round(p_precio_ofrecido, 2);
        if v_precio < round(v_precio_tarifa * 0.5, 2) then
            raise exception 'La oferta no puede ser menor a CRC % (la mitad de la tarifa)', round(v_precio_tarifa * 0.5);
        end if;
        if v_precio > v_precio_tarifa * 5 then
            raise exception 'La oferta no puede superar CRC % (cinco veces la tarifa)', round(v_precio_tarifa * 5);
        end if;
    end if;

    insert into public.paseos (id_mascota, id_dueno, id_paseador, zona_id, fecha, hora_inicio, duracion_min, precio, precio_tarifa, direccion_encuentro)
    values (p_id_mascota, v_dueno_id, p_id_paseador, v_zona_id, p_fecha, p_hora_inicio, p_duracion_min, v_precio, v_precio_tarifa, trim(p_direccion_encuentro))
    returning id_paseo into v_paseo_id;

    -- «hoy a las 18:30», «mañana a las 08:00» o «el 24/10 a las 08:00».
    v_cuando := case
        when p_fecha = public.hoy_cr() then 'hoy'
        when p_fecha = public.hoy_cr() + 1 then 'mañana'
        else 'el ' || to_char(p_fecha, 'DD/MM')
    end || ' a las ' || to_char(p_hora_inicio, 'HH24:MI');

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values
        (v_dueno_id, 'paseo', 'Solicitud de paseo creada para ' || v_mascota || '. Está en espera de que el paseador la confirme.', v_paseo_id),
        (p_id_paseador, 'paseo',
            'Nueva solicitud de paseo: ' || v_mascota || ' con ' || v_dueno || ', ' || p_duracion_min || ' min ' || v_cuando
            || '. Encuentro: ' || trim(p_direccion_encuentro) || '. '
            || case when v_precio <> v_precio_tarifa
                    then 'Oferta del dueño: ' || public.formatear_monto(v_precio) || ' (tu tarifa: ' || public.formatear_monto(v_precio_tarifa) || ').'
                    else 'Pago: ' || public.formatear_monto(v_precio) || '.' end,
            v_paseo_id);

    return v_paseo_id;
end;
$$;


-- ── 4. Que la API vea los cambios sin esperar ──────────────────────
notify pgrst, 'reload schema';
