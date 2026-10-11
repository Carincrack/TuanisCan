-- =====================================================================
-- Tiempo real y pago retenido
--
-- Dos cosas que el flujo paseador <-> dueño necesitaba:
--
-- 1. Las notificaciones llegaban recién al recargar la página. Se
--    publican en `supabase_realtime` y cada usuario las recibe al
--    instante (RLS sigue mandando: cada uno escucha solo las suyas).
--
-- 2. El dueño pagaba en cualquier momento y el paseador podía iniciar
--    el paseo sin que nadie hubiera pagado. Ahora el pago se RETIENE:
--
--      paseador acepta  -> pago 'pendiente' (como hasta ahora)
--      dueño confirma   -> pago 'retenido'  (se reserva el monto en su
--                          tarjeta o billetera, no se cobra todavía)
--      paseador inicia  -> solo si el pago está 'retenido'
--      paseador termina -> pago 'pagado'    (se cobra lo retenido)
--
--    Todo es simulado —no hay pasarela externa ni se mueve plata—, pero
--    el flujo sigue los pasos de un cobro con tarjeta de verdad:
--
--      autorizar   al reservar: se guarda una referencia de autorización
--                  simulada («SIM-…») en pagos.referencia_transaccion
--      capturar    al finalizar: se cobra lo autorizado, misma referencia
--      liberar     si el paseo se cancela con el pago reservado, la
--                  reserva se suelta y no se cobra nada
--
-- Se puede pegar entera en el SQL Editor. El valor nuevo del enum se
-- agrega primero y solo se usa DENTRO de funciones, que no lo leen
-- hasta que se ejecutan, así que no choca con estar en la misma
-- transacción.
-- =====================================================================


-- ── 0. La referencia, con nombre neutro ────────────────────────────
-- La columna nació como `referencia_tilopay` al crear la tabla, pero la
-- app no usa ninguna pasarela externa: los pagos son simulados. Se
-- renombra antes de empezar a usarla. Ningún código la leía.

do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'pagos'
          and column_name = 'referencia_tilopay'
    ) then
        alter table public.pagos rename column referencia_tilopay to referencia_transaccion;
    end if;
end $$;

alter index if exists public.pagos_referencia_tilopay_idx
    rename to pagos_referencia_transaccion_idx;

comment on column public.pagos.referencia_transaccion is
    'Referencia simulada de la autorización del pago («SIM-AAMMDD-XXXXXXXX»). Se genera al reservar.';


-- ── 1. El estado nuevo y cuándo se retuvo ──────────────────────────

alter type public.estado_pago add value if not exists 'retenido' before 'pagado';

alter table public.pagos
    add column if not exists fecha_retencion timestamptz;

comment on column public.pagos.fecha_retencion is
    'Cuándo el dueño confirmó el pago y se reservó el monto. El cobro real queda en fecha_pago, al finalizar el paseo.';


-- ── 2. Notificaciones en tiempo real ───────────────────────────────

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notificaciones'
    ) then
        alter publication supabase_realtime add table public.notificaciones;
    end if;
end $$;


-- ── 3. Retener el pago ──────────────────────────────────────────────
-- Con tarjeta guardada (p_id_metodo_pago) o con billetera digital
-- (p_billetera), una de las dos. Se puede volver a llamar mientras el
-- paseo no empezó para cambiar el método: el monto se vuelve a reservar
-- con el nuevo.
--
-- Según en qué está el paseo:
--   confirmado  se reserva ('retenido'); el paseador ya puede iniciar.
--   en_curso    se reserva igual; se cobra al finalizar. Es el caso de
--               paseos que arrancaron antes de esta regla.
--   finalizado  se cobra en el acto ('pagado'): el paseo ya se hizo y
--               el pago quedó pendiente de antes de esta regla.

create or replace function public.retener_pago_paseo(
    p_id_paseo uuid,
    p_id_metodo_pago uuid default null,
    p_billetera text default null
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
    v_colones text;
    v_marca text;
    v_ultimos4 text;
    v_exp_mes smallint;
    v_exp_ano smallint;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if (p_id_metodo_pago is null) = (p_billetera is null) then
        raise exception 'Elige una tarjeta guardada o una billetera digital';
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
        estado_pago = v_estado_nuevo::public.estado_pago,
        fecha_retencion = coalesce(fecha_retencion, now()),
        -- La referencia de la autorización, simulada. Cambiar de método
        -- es una autorización nueva, así que la referencia también cambia.
        referencia_transaccion = 'SIM-'
            || to_char(now() at time zone 'America/Costa_Rica', 'YYMMDD') || '-'
            || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
        fecha_pago = case when v_estado_nuevo = 'pagado' then now() else null end
    where id_paseo = p_id_paseo;

    if v_estado_nuevo = 'pagado' then
        -- Paseo ya hecho: al paseador le llega lo acreditado.
        v_colones := replace(to_char(v_precio - v_comision, 'FM999,999,990'), ',', ' ');
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_paseador_id,
            'pago',
            'Se acreditaron ₡' || v_colones || ' por el paseo de ' || v_mascota || '.',
            p_id_paseo
        );
    elsif v_estado_anterior <> 'retenido' then
        -- Al paseador se le avisa una sola vez: cambiar de tarjeta con
        -- el pago ya retenido no le cambia nada a él.
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

revoke all on function public.retener_pago_paseo(uuid, uuid, text) from public;
grant execute on function public.retener_pago_paseo(uuid, uuid, text) to authenticated;


-- Las dos funciones de antes cobraban en el acto. Ahora pasan por la
-- retención, para que no quede un camino que se salte el flujo.

create or replace function public.procesar_pago(
    p_id_paseo uuid,
    p_id_metodo_pago uuid
)
returns public.estado_pago
language sql
security definer
set search_path = ''
as $$
    select public.retener_pago_paseo(p_id_paseo, p_id_metodo_pago, null);
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
    select public.retener_pago_paseo(p_id_paseo, null, p_billetera);
$$;


-- ── 3b. Los pagos del dueño traen el estado del paseo ──────────────
-- Para que la ventana de pago diga lo que va a pasar: «se reserva y se
-- cobra al terminar» o, con el paseo ya hecho, «se cobra ahora». Cambia
-- lo que devuelve, así que se borra y se vuelve a crear.

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
    fecha_retencion timestamptz
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
        pg.fecha_retencion
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_paseador
    where p.id_dueno = (select auth.uid())
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
$$;

revoke all on function public.listar_pagos_dueno() from public;
grant execute on function public.listar_pagos_dueno() to authenticated;


-- ── 4. Iniciar: solo con el pago retenido ──────────────────────────
-- Además, la fecha se compara en hora de Costa Rica. `current_date`
-- es la del servidor (UTC): desde las 6 p. m. un paseo de hoy ya
-- figuraba como de mañana y no se podía iniciar.

create or replace function public.iniciar_mi_paseo(p_id_paseo uuid)
returns public.estado_paseo
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid;
    v_mascota text;
    v_fecha date;
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Tu cuenta no esta habilitada';
    end if;

    select p.id_dueno, m.nombre, p.fecha
    into v_dueno_id, v_mascota, v_fecha
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_paseador = (select auth.uid())
      and p.estado = 'confirmado'
    for update of p;

    if not found then
        raise exception 'El paseo debe estar confirmado y pertenecerte';
    end if;

    if v_fecha <> (now() at time zone 'America/Costa_Rica')::date then
        raise exception 'Este paseo es para el %; solo se puede iniciar ese día', to_char(v_fecha, 'DD/MM/YYYY');
    end if;

    if not exists (
        select 1
        from public.pagos pg
        where pg.id_paseo = p_id_paseo
          and pg.estado_pago::text in ('retenido', 'pagado')
    ) then
        raise exception 'El dueño todavía no confirmó el pago. Podrás iniciar el paseo apenas lo haga.';
    end if;

    update public.paseos
    set estado = 'en_curso'
    where id_paseo = p_id_paseo;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'paseo',
        'El paseo de ' || v_mascota || ' ya inició. Puedes ver su ubicación en tiempo real.',
        p_id_paseo
    );

    return 'en_curso'::public.estado_paseo;
end;
$$;

revoke all on function public.iniciar_mi_paseo(uuid) from public;
grant execute on function public.iniciar_mi_paseo(uuid) to authenticated;


-- ── 5. Finalizar: se cobra lo retenido ─────────────────────────────

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
    v_colones text;
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
    returning monto, comision_plataforma
    into v_monto, v_comision;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'resena',
        'El paseo de ' || v_mascota || ' finalizó. Ya puedes dejar tu reseña.',
        p_id_paseo
    );

    if v_monto is not null then
        -- «₡10 000»: miles separados por espacio, como en la app.
        v_colones := replace(to_char(v_monto, 'FM999,999,990'), ',', ' ');

        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values
            (
                v_dueno_id,
                'pago',
                'Se cobraron ₡' || v_colones || ' por el paseo de ' || v_mascota || '.',
                p_id_paseo
            ),
            (
                v_paseador_id,
                'pago',
                'Se acreditaron ₡' || replace(to_char(v_monto - v_comision, 'FM999,999,990'), ',', ' ')
                    || ' por el paseo de ' || v_mascota
                    || ' (₡' || v_colones || ' menos la comisión de ₡'
                    || replace(to_char(v_comision, 'FM999,999,990'), ',', ' ') || ').',
                p_id_paseo
            );
    end if;

    return 'finalizado'::public.estado_paseo;
end;
$$;

revoke all on function public.finalizar_mi_paseo(uuid) from public;
grant execute on function public.finalizar_mi_paseo(uuid) to authenticated;


-- ── 6. Al aceptar: decirle al dueño qué tiene que hacer ────────────

create or replace function public.crear_pago_al_confirmar_paseo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if new.estado = 'confirmado'
       and old.estado is distinct from new.estado then
        insert into public.pagos (
            id_paseo,
            monto,
            comision_plataforma,
            metodo_pago
        ) values (
            new.id_paseo,
            new.precio,
            round(new.precio * 0.15),
            'Pendiente'
        )
        on conflict (id_paseo) do nothing;

        insert into public.notificaciones (
            id_usuario,
            tipo,
            mensaje,
            referencia_id
        ) values (
            new.id_dueno,
            'pago',
            'Tu paseo fue aceptado. Confirma el pago para que el paseador pueda iniciarlo: el monto se reserva y se cobra recién cuando el paseo termine.',
            new.id_paseo
        );
    end if;

    return new;
end;
$$;

revoke all on function public.crear_pago_al_confirmar_paseo() from public;


-- ── 7. Liberar la reserva si el paseo se cancela ──────────────────
-- Una autorización que no se va a capturar se suelta: el dueño no paga
-- nada. Queda como 'reembolsado' —para él es plata que vuelve— y se le
-- avisa. Hoy ningún flujo cancela un paseo ya aceptado; esto cubre el
-- día que exista, o una cancelación hecha a mano por el equipo.

create or replace function public.liberar_pago_al_cancelar_paseo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_monto numeric(10, 2);
    v_mascota text;
begin
    if new.estado = 'cancelado'
       and old.estado is distinct from new.estado then
        update public.pagos
        set estado_pago = 'reembolsado'
        where id_paseo = new.id_paseo
          and estado_pago::text = 'retenido'
        returning monto into v_monto;

        if v_monto is not null then
            select m.nombre into v_mascota
            from public.mascotas m
            where m.id_mascota = new.id_mascota;

            insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
            values (
                new.id_dueno,
                'pago',
                'Se liberó la reserva de ₡' || replace(to_char(v_monto, 'FM999,999,990'), ',', ' ')
                    || ' del paseo de ' || coalesce(v_mascota, 'tu mascota') || '. No se te cobró nada.',
                new.id_paseo
            );
        end if;
    end if;

    return new;
end;
$$;

revoke all on function public.liberar_pago_al_cancelar_paseo() from public;

drop trigger if exists liberar_pago_al_cancelar_paseo on public.paseos;

create trigger liberar_pago_al_cancelar_paseo
    after update of estado on public.paseos
    for each row execute function public.liberar_pago_al_cancelar_paseo();


-- ── 8. Que la API vea las funciones nuevas sin esperar ─────────────
notify pgrst, 'reload schema';
