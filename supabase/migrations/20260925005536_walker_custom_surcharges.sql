-- Cada paseador define sus recargos: cuanto cobra de mas en horario
-- nocturno, fin de semana y paseos para el mismo dia, y que horas
-- cuentan como nocturnas. Antes eran reglas fijas del sistema
-- (8 %, 12 %, 10 %, de 19:00 a 06:00); esos quedan como valores por
-- defecto para que ningun precio existente cambie de golpe.

alter table public.paseadores
    add column if not exists recargo_nocturno numeric(5, 2) not null default 8,
    add column if not exists recargo_fin_semana numeric(5, 2) not null default 12,
    add column if not exists recargo_mismo_dia numeric(5, 2) not null default 10,
    add column if not exists nocturno_desde time not null default '19:00',
    add column if not exists nocturno_hasta time not null default '06:00';

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'paseadores_recargos_validos'
          and conrelid = 'public.paseadores'::regclass
    ) then
        alter table public.paseadores
            add constraint paseadores_recargos_validos check (
                recargo_nocturno between 0 and 100
                and recargo_fin_semana between 0 and 100
                and recargo_mismo_dia between 0 and 100
                and nocturno_desde <> nocturno_hasta
            );
    end if;
end $$;

-- El rango nocturno puede cruzar la medianoche (19:00 a 06:00) o no
-- (00:00 a 05:00).
create or replace function public.es_horario_nocturno(
    p_hora time,
    p_desde time,
    p_hasta time
)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select case
        when p_desde > p_hasta then p_hora >= p_desde or p_hora < p_hasta
        else p_hora >= p_desde and p_hora < p_hasta
    end;
$$;

revoke all on function public.es_horario_nocturno(time, time, time) from public, anon;
grant execute on function public.es_horario_nocturno(time, time, time) to authenticated;

-- La version vieja recibia la tarifa suelta y aplicaba recargos fijos.
drop function if exists public.calcular_precio_paseo(numeric, date, time, integer);

-- `stable`, no `immutable`: depende de current_date y de la tabla.
create or replace function public.calcular_precio_paseo(
    p_id_paseador uuid,
    p_fecha date,
    p_hora_inicio time,
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
            + case
                when public.es_horario_nocturno(p_hora_inicio, p.nocturno_desde, p.nocturno_hasta)
                    then p.recargo_nocturno / 100
                else 0
              end
            + case when extract(isodow from p_fecha) in (6, 7) then p.recargo_fin_semana / 100 else 0 end
            + case when p_fecha = current_date then p.recargo_mismo_dia / 100 else 0 end
        ),
        2
    )
    from public.paseadores p
    where p.id_usuario = p_id_paseador;
$$;

revoke all on function public.calcular_precio_paseo(uuid, date, time, integer) from public, anon;
grant execute on function public.calcular_precio_paseo(uuid, date, time, integer) to authenticated;

-- Misma funcion, ahora calculando con la configuracion del paseador.
create or replace function public.solicitar_paseo(
    p_id_mascota uuid,
    p_id_paseador uuid,
    p_fecha date,
    p_hora_inicio time,
    p_duracion_min integer,
    p_direccion_encuentro text,
    p_precio_ofrecido numeric default null
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

    insert into public.paseos (
        id_mascota,
        id_dueno,
        id_paseador,
        zona_id,
        fecha,
        hora_inicio,
        duracion_min,
        precio,
        precio_tarifa,
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
        v_precio_tarifa,
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
            'Nueva solicitud de paseo: ' || v_mascota || ' con ' || v_dueno || ', ' || p_duracion_min || ' min el ' || p_fecha || ' a las ' || p_hora_inicio || '. Encuentro: ' || trim(p_direccion_encuentro) || '. '
            || case
                when v_precio <> v_precio_tarifa
                    then 'Oferta del dueno: CRC ' || v_precio || ' (tu tarifa: CRC ' || v_precio_tarifa || ').'
                else 'Pago: CRC ' || v_precio || '.'
            end,
            v_paseo_id
        );

    return v_paseo_id;
end;
$$;

revoke all on function public.solicitar_paseo(uuid, uuid, date, time, integer, text, numeric) from public, anon;
grant execute on function public.solicitar_paseo(uuid, uuid, date, time, integer, text, numeric) to authenticated;

-- El directorio devuelve los recargos para que el dueno vea el
-- desglose antes de pedir. Cambia el tipo de retorno.
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
    recargo_nocturno numeric,
    recargo_fin_semana numeric,
    recargo_mismo_dia numeric,
    nocturno_desde time,
    nocturno_hasta time,
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
        p.recargo_nocturno,
        p.recargo_fin_semana,
        p.recargo_mismo_dia,
        p.nocturno_desde,
        p.nocturno_hasta,
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
        p.recargo_nocturno,
        p.recargo_fin_semana,
        p.recargo_mismo_dia,
        p.nocturno_desde,
        p.nocturno_hasta,
        p.calificacion_promedio,
        p.disponible
    order by
        p.calificacion_promedio desc,
        p.tarifa_base asc nulls last,
        coalesce(pu.nombre, nullif(split_part(u.correo, '@', 1), ''), 'Usuario');
$$;

revoke all on function public.buscar_paseadores(uuid, boolean, numeric) from public, anon;
grant execute on function public.buscar_paseadores(uuid, boolean, numeric) to authenticated;
