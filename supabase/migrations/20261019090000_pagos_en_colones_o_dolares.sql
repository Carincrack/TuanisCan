-- =====================================================================
-- Pagos en colones o en dólares, y el detalle de cada pago
--
-- El precio del paseo sigue en colones: es lo que fija el paseador y
-- sobre lo que se calcula la comisión. Lo nuevo es CON QUÉ moneda paga
-- el dueño. Si elige dólares, el monto en colones se convierte con el
-- tipo de cambio del día y se guarda la cuenta completa:
--
--   pagos.monto          ₡10 000   lo que vale el paseo (siempre colones)
--   pagos.moneda         'USD'     en qué paga el dueño
--   pagos.tipo_cambio    448.31    colones por dólar usados
--   pagos.monto_moneda   22.31     lo que se le reserva y cobra en dólares
--
-- Comisión, neto del paseador y todos los tableros siguen sumando en
-- colones, así que dueño, paseador y admin cuadran igual que antes,
-- pague en la moneda que pague. Al paseador siempre se le acredita en
-- colones.
--
-- El tipo de cambio lo consulta la app (Ministerio de Hacienda, el de
-- COMPRA: la plataforma le compra los dólares al dueño) y lo manda al
-- reservar; aquí solo se revisa que sea razonable. Con una pasarela
-- real, la conversión la hace la pasarela y esto se reemplaza por lo
-- que ella devuelva.
--
-- Además, `listar_finanzas_admin` trae el detalle completo de cada
-- pago: método, referencia, moneda, fechas, estado del paseo y zona.
--
-- Se puede pegar entera en el SQL Editor y volver a correr sin daño.
-- =====================================================================


-- ── 1. Moneda y conversión ─────────────────────────────────────────
-- `moneda` nació con un check que solo aceptaba 'CRC'. Los pagos que
-- ya existen quedan en colones y sin conversión: cumplen las dos reglas.
-- Los `is not null` no sobran: un check que da NULL cuenta como
-- cumplido, y `null > 0` da NULL.

alter table public.pagos drop constraint if exists pagos_moneda_check;
alter table public.pagos drop constraint if exists pagos_conversion_coherente;

alter table public.pagos
    add column if not exists tipo_cambio numeric(10, 2),
    add column if not exists monto_moneda numeric(12, 2);

alter table public.pagos
    add constraint pagos_moneda_check check (moneda in ('CRC', 'USD')),
    add constraint pagos_conversion_coherente check (
        (moneda = 'CRC' and tipo_cambio is null and monto_moneda is null)
        or (
            moneda = 'USD'
            and tipo_cambio is not null and tipo_cambio > 0
            and monto_moneda is not null and monto_moneda > 0
        )
    );

comment on column public.pagos.moneda is
    'En qué paga el dueño: CRC o USD. monto y comision_plataforma siempre están en colones.';
comment on column public.pagos.tipo_cambio is
    'Colones por dólar usados al reservar (tipo de compra). Solo con moneda USD.';
comment on column public.pagos.monto_moneda is
    'Lo que se reserva y cobra al dueño en dólares: monto / tipo_cambio, a dos decimales. Solo con moneda USD.';


-- ── 2. Montos en texto, para los avisos ────────────────────────────
-- «₡10 000» y «$22,31»: miles con espacio y decimales con coma, como
-- los escribe la app.

create or replace function public.formatear_monto(p_monto numeric, p_moneda text default 'CRC')
returns text
language sql
immutable
set search_path = ''
as $$
    select case
        when p_moneda = 'USD'
            then '$' || replace(replace(to_char(p_monto, 'FM999,999,990.00'), ',', ' '), '.', ',')
        else '₡' || replace(to_char(p_monto, 'FM999,999,990'), ',', ' ')
    end;
$$;

revoke all on function public.formatear_monto(numeric, text) from public, anon, authenticated;


-- ── 3. Retener el pago, en colones o en dólares ────────────────────
-- Igual que antes más dos parámetros: `p_moneda` ('CRC' por omisión) y
-- `p_tipo_cambio` (obligatorio con 'USD'). Cambia la firma, así que la
-- versión de tres parámetros se borra: con las dos vivas, una llamada
-- con solo paseo y tarjeta no sabría a cuál ir. Llamar sin moneda
-- sigue funcionando igual que siempre: paga en colones.

drop function if exists public.retener_pago_paseo(uuid, uuid, text);

create or replace function public.retener_pago_paseo(
    p_id_paseo uuid,
    p_id_metodo_pago uuid default null,
    p_billetera text default null,
    p_moneda text default 'CRC',
    p_tipo_cambio numeric default null
)
returns public.estado_pago
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_precio numeric(10, 2);
    v_comision numeric(10, 2);
    v_estado_paseo public.estado_paseo;
    v_paseador_id uuid;
    v_mascota text;
    v_metodo text;
    v_estado_anterior text;
    v_estado_nuevo text;
    v_marca text;
    v_ultimos4 text;
    v_exp_mes smallint;
    v_exp_ano smallint;
    v_moneda text := upper(coalesce(nullif(trim(p_moneda), ''), 'CRC'));
    v_tipo_cambio numeric(10, 2);
    v_monto_moneda numeric(12, 2);
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if (p_id_metodo_pago is null) = (p_billetera is null) then
        raise exception 'Elige una tarjeta guardada o una billetera digital';
    end if;

    if v_moneda not in ('CRC', 'USD') then
        raise exception 'Solo se puede pagar en colones o en dólares';
    end if;

    if v_moneda = 'USD' then
        -- Fuera de este rango es un error de la consulta, no el mercado.
        -- La app revisa el mismo rango antes de mandarlo.
        if p_tipo_cambio is null or p_tipo_cambio < 300 or p_tipo_cambio > 1000 then
            raise exception 'El tipo de cambio no es válido. Vuelve a intentarlo.';
        end if;
        v_tipo_cambio := round(p_tipo_cambio, 2);
    end if;

    select p.precio, p.estado, p.id_paseador, m.nombre
    into v_precio, v_estado_paseo, v_paseador_id, v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_dueno = v_usuario_id
    for update of p;

    if not found then
        raise exception 'El paseo no existe o no pertenece a tu cuenta';
    end if;

    if v_estado_paseo not in ('confirmado', 'en_curso', 'finalizado') then
        raise exception 'Este paseo no tiene un pago para confirmar';
    end if;

    v_estado_nuevo := case when v_estado_paseo = 'finalizado' then 'pagado' else 'retenido' end;

    if p_id_metodo_pago is not null then
        select mp.marca, mp.ultimos4, mp.exp_mes, mp.exp_ano
        into v_marca, v_ultimos4, v_exp_mes, v_exp_ano
        from public.metodos_pago mp
        where mp.id_metodo_pago = p_id_metodo_pago
          and mp.id_usuario = v_usuario_id;

        if not found then
            raise exception 'Metodo de pago no valido';
        end if;

        if v_exp_ano < extract(year from current_date)::integer
           or (
                v_exp_ano = extract(year from current_date)::integer
                and v_exp_mes < extract(month from current_date)::integer
           ) then
            raise exception 'La tarjeta esta vencida';
        end if;

        v_metodo := v_marca || ' •••• ' || v_ultimos4;
    else
        if p_billetera not in ('PayPal', 'Google Pay', 'Apple Pay') then
            raise exception 'Billetera digital no soportada';
        end if;

        v_metodo := p_billetera;
    end if;

    -- La comisión se redondea a colones enteros, igual que siempre.
    v_comision := round(v_precio * 0.15);

    if v_moneda = 'USD' then
        v_monto_moneda := round(v_precio / v_tipo_cambio, 2);
    end if;

    insert into public.pagos (id_paseo, monto, comision_plataforma, metodo_pago)
    values (p_id_paseo, v_precio, v_comision, 'Pendiente')
    on conflict (id_paseo) do nothing;

    select pg.estado_pago::text
    into v_estado_anterior
    from public.pagos pg
    where pg.id_paseo = p_id_paseo
    for update;

    if v_estado_anterior = 'pagado' then
        raise exception 'El paseo ya esta pagado';
    end if;

    if v_estado_anterior = 'reembolsado' then
        raise exception 'El pago de este paseo fue reembolsado';
    end if;

    update public.pagos
    set monto = v_precio,
        comision_plataforma = v_comision,
        id_metodo_pago = p_id_metodo_pago,
        metodo_pago = v_metodo,
        moneda = v_moneda,
        tipo_cambio = v_tipo_cambio,
        monto_moneda = v_monto_moneda,
        estado_pago = v_estado_nuevo::public.estado_pago,
        fecha_retencion = coalesce(fecha_retencion, now()),
        -- La referencia de la autorización, simulada. Cambiar de método
        -- o de moneda es una autorización nueva: la referencia cambia.
        referencia_transaccion = 'SIM-'
            || to_char(now() at time zone 'America/Costa_Rica', 'YYMMDD') || '-'
            || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
        fecha_pago = case when v_estado_nuevo = 'pagado' then now() else null end
    where id_paseo = p_id_paseo;

    if v_estado_nuevo = 'pagado' then
        -- Paseo ya hecho: al paseador le llega lo acreditado, en colones.
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_paseador_id,
            'pago',
            'Se acreditaron ' || public.formatear_monto(v_precio - v_comision)
                || ' por el paseo de ' || v_mascota || '.',
            p_id_paseo
        );
    elsif v_estado_anterior <> 'retenido' then
        -- Al paseador se le avisa una sola vez: cambiar de tarjeta o de
        -- moneda con el pago ya retenido no le cambia nada a él.
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_paseador_id,
            'pago',
            'El dueño de ' || v_mascota || ' confirmó el pago. Ya puedes iniciar el paseo a la hora acordada.',
            p_id_paseo
        );
    end if;

    return v_estado_nuevo::public.estado_pago;
end;
$$;

revoke all on function public.retener_pago_paseo(uuid, uuid, text, text, numeric) from public;
grant execute on function public.retener_pago_paseo(uuid, uuid, text, text, numeric) to authenticated;


-- Las dos funciones viejas siguen pasando por la retención, en colones.

create or replace function public.procesar_pago(
    p_id_paseo uuid,
    p_id_metodo_pago uuid
)
returns public.estado_pago
language sql
security definer
set search_path = ''
as $$
    select public.retener_pago_paseo(p_id_paseo, p_id_metodo_pago, null::text, 'CRC', null::numeric);
$$;

create or replace function public.procesar_pago_billetera(
    p_id_paseo uuid,
    p_billetera text
)
returns public.estado_pago
language sql
security definer
set search_path = ''
as $$
    select public.retener_pago_paseo(p_id_paseo, null::uuid, p_billetera, 'CRC', null::numeric);
$$;


-- ── 4. Los pagos del dueño traen la moneda ─────────────────────────

drop function if exists public.listar_pagos_dueno();

create function public.listar_pagos_dueno()
returns table (
    id_pago uuid,
    id_paseo uuid,
    mascota text,
    paseador text,
    fecha date,
    duracion_min integer,
    monto numeric,
    comision_plataforma numeric,
    metodo_pago text,
    estado_pago public.estado_pago,
    fecha_pago timestamptz,
    estado_paseo public.estado_paseo,
    referencia text,
    fecha_retencion timestamptz,
    moneda text,
    tipo_cambio numeric,
    monto_moneda numeric
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        pg.id_pago,
        p.id_paseo,
        m.nombre::text,
        coalesce(nullif(trim(pu.nombre), ''), 'Paseador')::text,
        p.fecha,
        p.duracion_min,
        pg.monto,
        pg.comision_plataforma,
        pg.metodo_pago::text,
        pg.estado_pago,
        pg.fecha_pago,
        p.estado,
        pg.referencia_transaccion::text,
        pg.fecha_retencion,
        pg.moneda,
        pg.tipo_cambio,
        pg.monto_moneda
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_paseador
    where p.id_dueno = (select auth.uid())
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
$$;

revoke all on function public.listar_pagos_dueno() from public;
grant execute on function public.listar_pagos_dueno() to authenticated;


-- ── 5. Finalizar: el aviso del cobro dice en qué moneda ────────────

create or replace function public.finalizar_mi_paseo(p_id_paseo uuid)
returns public.estado_paseo
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid;
    v_paseador_id uuid;
    v_mascota text;
    v_monto numeric(10, 2);
    v_comision numeric(10, 2);
    v_moneda text;
    v_monto_moneda numeric(12, 2);
    v_cobrado text;
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Tu cuenta no esta habilitada';
    end if;

    select p.id_dueno, p.id_paseador, m.nombre
    into v_dueno_id, v_paseador_id, v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_paseador = (select auth.uid())
      and p.estado = 'en_curso'
    for update of p;

    if not found then
        raise exception 'El paseo no esta en curso o no te pertenece';
    end if;

    update public.paseos
    set estado = 'finalizado',
        hora_fin = (now() at time zone 'America/Costa_Rica')::time
    where id_paseo = p_id_paseo;

    -- El cobro: lo retenido pasa a pagado.
    update public.pagos
    set estado_pago = 'pagado',
        fecha_pago = now()
    where id_paseo = p_id_paseo
      and estado_pago::text = 'retenido'
    returning monto, comision_plataforma, moneda, monto_moneda
    into v_monto, v_comision, v_moneda, v_monto_moneda;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'resena',
        'El paseo de ' || v_mascota || ' finalizó. Ya puedes dejar tu reseña.',
        p_id_paseo
    );

    if v_monto is not null then
        -- En dólares se dice lo cobrado y, entre paréntesis, cuánto es
        -- en colones: «$22,31 (₡10 000)».
        v_cobrado := case
            when v_moneda = 'USD'
                then public.formatear_monto(v_monto_moneda, 'USD') || ' (' || public.formatear_monto(v_monto) || ')'
            else public.formatear_monto(v_monto)
        end;

        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values
            (
                v_dueno_id,
                'pago',
                'Se cobraron ' || v_cobrado || ' por el paseo de ' || v_mascota || '.',
                p_id_paseo
            ),
            (
                v_paseador_id,
                'pago',
                'Se acreditaron ' || public.formatear_monto(v_monto - v_comision)
                    || ' por el paseo de ' || v_mascota
                    || ' (' || public.formatear_monto(v_monto) || ' menos la comisión de '
                    || public.formatear_monto(v_comision) || ').',
                p_id_paseo
            );
    end if;

    return 'finalizado'::public.estado_paseo;
end;
$$;

revoke all on function public.finalizar_mi_paseo(uuid) from public;
grant execute on function public.finalizar_mi_paseo(uuid) to authenticated;


-- ── 6. Liberar la reserva: el aviso dice en qué moneda ─────────────
-- El trigger que la llama ya existe y no cambia.

create or replace function public.liberar_pago_al_cancelar_paseo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_monto numeric(10, 2);
    v_moneda text;
    v_monto_moneda numeric(12, 2);
    v_mascota text;
begin
    if new.estado = 'cancelado'
       and old.estado is distinct from new.estado then
        update public.pagos
        set estado_pago = 'reembolsado'
        where id_paseo = new.id_paseo
          and estado_pago::text = 'retenido'
        returning monto, moneda, monto_moneda into v_monto, v_moneda, v_monto_moneda;

        if v_monto is not null then
            select m.nombre into v_mascota
            from public.mascotas m
            where m.id_mascota = new.id_mascota;

            insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
            values (
                new.id_dueno,
                'pago',
                'Se liberó la reserva de '
                    || case when v_moneda = 'USD'
                            then public.formatear_monto(v_monto_moneda, 'USD')
                            else public.formatear_monto(v_monto)
                       end
                    || ' del paseo de ' || coalesce(v_mascota, 'tu mascota') || '. No se te cobró nada.',
                new.id_paseo
            );
        end if;
    end if;

    return new;
end;
$$;

revoke all on function public.liberar_pago_al_cancelar_paseo() from public;


-- ── 7. Pagos y comisiones del admin, con todo el detalle ───────────
-- Las nueve columnas de antes quedan primero y en el mismo orden; las
-- nuevas van detrás. Cambia lo que devuelve: se borra y se recrea.

drop function if exists public.listar_finanzas_admin();

create function public.listar_finanzas_admin()
returns table (
    id_pago uuid,
    fecha date,
    mascota text,
    dueno text,
    paseador text,
    bruto numeric,
    comision numeric,
    neto_paseador numeric,
    estado_pago public.estado_pago,
    id_paseo uuid,
    hora_inicio time,
    duracion_min integer,
    zona text,
    estado_paseo public.estado_paseo,
    metodo_pago text,
    referencia text,
    moneda text,
    tipo_cambio numeric,
    monto_moneda numeric,
    creado_en timestamptz,
    fecha_retencion timestamptz,
    fecha_pago timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.es_admin_actual() then
        raise exception 'Acceso denegado';
    end if;

    return query
    select
        pg.id_pago,
        p.fecha,
        m.nombre::text,
        coalesce(nullif(trim(pu_dueno.nombre), ''), 'Dueno')::text,
        coalesce(nullif(trim(pu_paseador.nombre), ''), 'Paseador')::text,
        pg.monto,
        pg.comision_plataforma,
        pg.monto - pg.comision_plataforma,
        pg.estado_pago,
        p.id_paseo,
        p.hora_inicio,
        p.duracion_min,
        z.nombre::text,
        p.estado,
        pg.metodo_pago::text,
        pg.referencia_transaccion::text,
        pg.moneda,
        pg.tipo_cambio,
        pg.monto_moneda,
        pg.creado_en,
        pg.fecha_retencion,
        pg.fecha_pago
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu_dueno on pu_dueno.id_usuario = p.id_dueno
    left join public.perfil_usuario pu_paseador on pu_paseador.id_usuario = p.id_paseador
    left join public.zonas z on z.id_zona = p.zona_id
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
end;
$$;

revoke all on function public.listar_finanzas_admin() from public;
grant execute on function public.listar_finanzas_admin() to authenticated;


-- ── 8. Que la API vea las funciones nuevas sin esperar ─────────────
notify pgrst, 'reload schema';
