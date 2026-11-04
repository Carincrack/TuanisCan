-- El dueno puede ofrecer un precio distinto a la tarifa al solicitar
-- un paseo. `precio` es lo que se cobra si el paseador acepta (la
-- oferta o, sin oferta, la tarifa); `precio_tarifa` guarda lo que
-- habria costado segun la tarifa, para que el paseador compare.

alter table public.paseos
    add column if not exists precio_tarifa numeric;

-- El backfill corre sin usuario: se apaga solo el trigger que exige
-- verificacion mientras dura, dentro de la misma transaccion.
alter table public.paseos disable trigger exigir_usuario_verificado;

update public.paseos
set precio_tarifa = precio
where precio_tarifa is null;

alter table public.paseos enable trigger exigir_usuario_verificado;

alter table public.paseos
    alter column precio_tarifa set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'paseos_precio_positivo'
          and conrelid = 'public.paseos'::regclass
    ) then
        alter table public.paseos
            add constraint paseos_precio_positivo check (precio > 0 and precio_tarifa > 0);
    end if;
end $$;

-- Se reemplaza la firma de seis argumentos: con un septimo opcional
-- las dos quedarian ambiguas para PostgREST.
drop function if exists public.solicitar_paseo(uuid, uuid, date, time, integer, text);

create function public.solicitar_paseo(
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

    v_precio_tarifa := public.calcular_precio_paseo(v_tarifa_base, p_fecha, p_hora_inicio, p_duracion_min);

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

revoke all on function public.solicitar_paseo(uuid, uuid, date, time, integer, text, numeric) from public;
grant execute on function public.solicitar_paseo(uuid, uuid, date, time, integer, text, numeric) to authenticated;

-- El paseador necesita la tarifa para comparar con la oferta.
drop function if exists public.listar_solicitudes_paseador();

create function public.listar_solicitudes_paseador()
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
    sexo text,
    fecha_nacimiento date,
    peso numeric,
    color text,
    esterilizado boolean,
    microchip text,
    alergias text,
    veterinaria text,
    notas text,
    vacunas jsonb,
    padecimientos jsonb,
    zona text,
    fecha date,
    hora_inicio time,
    duracion_min integer,
    direccion_encuentro text,
    precio numeric,
    precio_tarifa numeric,
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
        coalesce(nullif(trim(pu.nombre), ''), nullif(split_part(u.correo, '@', 1), ''), 'Dueno')::text,
        pu.foto_perfil,
        m.id_mascota,
        m.nombre::text,
        m.raza::text,
        m.especie::text,
        m.foto,
        m.sexo::text,
        m.fecha_nacimiento,
        m.peso,
        m.color::text,
        m.esterilizado,
        m.microchip::text,
        m.alergias,
        m.veterinaria::text,
        m.notas,
        coalesce(vacunas_agg.vacunas, '[]'::jsonb),
        coalesce(padecimientos_agg.padecimientos, '[]'::jsonb),
        coalesce(z.nombre, 'Sin zona')::text,
        p.fecha,
        p.hora_inicio,
        p.duracion_min,
        p.direccion_encuentro,
        p.precio,
        p.precio_tarifa,
        p.estado,
        p.comentario_respuesta
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    inner join public.usuarios u on u.id_usuario = p.id_dueno
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    left join public.zonas z on z.id_zona = p.zona_id
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'nombre_vacuna', v.nombre_vacuna,
                'fecha_aplicacion', v.fecha_aplicacion,
                'fecha_vencimiento', v.fecha_vencimiento
            ) order by v.fecha_aplicacion desc
        ) as vacunas
        from public.historial_vacunas v
        where v.id_mascota = m.id_mascota
    ) vacunas_agg on true
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'nombre', d.nombre,
                'cuidados', d.cuidados,
                'fecha_diagnostico', d.fecha_diagnostico
            ) order by d.fecha_registro
        ) as padecimientos
        from public.padecimientos_mascota d
        where d.id_mascota = m.id_mascota
    ) padecimientos_agg on true
    where p.id_paseador = (select auth.uid())
      and p.estado = 'solicitado'
    order by p.fecha, p.hora_inicio;
$$;

revoke all on function public.listar_solicitudes_paseador() from public;
grant execute on function public.listar_solicitudes_paseador() to authenticated;
