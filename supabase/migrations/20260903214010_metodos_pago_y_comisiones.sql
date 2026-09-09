-- Metodos de pago y distribucion de comisiones. Nunca se guarda el numero completo ni el CVV.
create table public.metodos_pago (
    id_metodo_pago uuid primary key default gen_random_uuid(),
    id_usuario uuid not null references public.usuarios(id_usuario) on delete cascade,
    titular text not null check (char_length(titular) between 3 and 120),
    marca text not null check (marca in ('Visa', 'Mastercard')),
    ultimos4 text not null check (ultimos4 ~ '^[0-9]{4}$'),
    exp_mes smallint not null check (exp_mes between 1 and 12),
    exp_ano smallint not null check (exp_ano between 2000 and 9999),
    es_principal boolean not null default false,
    creado_en timestamptz not null default now()
);

create index metodos_pago_id_usuario_idx
    on public.metodos_pago(id_usuario);

create unique index metodos_pago_principal_usuario_idx
    on public.metodos_pago(id_usuario)
    where es_principal;

alter table public.metodos_pago enable row level security;
revoke all on table public.metodos_pago from anon, authenticated;
grant select on table public.metodos_pago to authenticated;

create policy "Los usuarios ven sus metodos de pago"
    on public.metodos_pago for select to authenticated
    using ((select auth.uid()) = id_usuario);

create trigger exigir_usuario_verificado
    before insert or update or delete on public.metodos_pago
    for each row execute function public.exigir_usuario_verificado();

create or replace function public.registrar_metodo_pago(
    p_titular text,
    p_marca text,
    p_ultimos4 text,
    p_exp_mes integer,
    p_exp_ano integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_metodo_id uuid;
    v_es_principal boolean;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo()
       or not public.usuario_actual_verificado()
       or not exists (
            select 1 from public.duenos where id_usuario = v_usuario_id
       ) then
        raise exception 'La cuenta no esta habilitada para registrar tarjetas';
    end if;

    if char_length(trim(coalesce(p_titular, ''))) not between 3 and 120 then
        raise exception 'Indica el nombre del titular';
    end if;

    if p_marca not in ('Visa', 'Mastercard') then
        raise exception 'Marca de tarjeta no permitida';
    end if;

    if p_ultimos4 is null or p_ultimos4 !~ '^[0-9]{4}$' then
        raise exception 'Ultimos cuatro digitos invalidos';
    end if;

    if p_exp_mes not between 1 and 12
       or p_exp_ano < extract(year from current_date)::integer
       or (
            p_exp_ano = extract(year from current_date)::integer
            and p_exp_mes < extract(month from current_date)::integer
       ) then
        raise exception 'La tarjeta esta vencida';
    end if;

    perform pg_advisory_xact_lock(hashtext(v_usuario_id::text));

    select not exists (
        select 1
        from public.metodos_pago
        where id_usuario = v_usuario_id
    ) into v_es_principal;

    insert into public.metodos_pago (
        id_usuario,
        titular,
        marca,
        ultimos4,
        exp_mes,
        exp_ano,
        es_principal
    ) values (
        v_usuario_id,
        trim(p_titular),
        p_marca,
        p_ultimos4,
        p_exp_mes,
        p_exp_ano,
        v_es_principal
    )
    returning id_metodo_pago into v_metodo_id;

    return v_metodo_id;
end;
$$;

revoke all on function public.registrar_metodo_pago(text, text, text, integer, integer) from public;
grant execute on function public.registrar_metodo_pago(text, text, text, integer, integer) to authenticated;

alter table public.pagos
    add column id_metodo_pago uuid references public.metodos_pago(id_metodo_pago) on delete set null,
    add column moneda text not null default 'CRC' check (moneda = 'CRC'),
    add column creado_en timestamptz not null default now();

alter table public.pagos
    add constraint pagos_comision_no_supera_monto
    check (comision_plataforma <= monto);

create index pagos_id_metodo_pago_idx
    on public.pagos(id_metodo_pago);

-- El navegador solo puede leer pagos. Montos y estados cambian por funciones controladas.
drop policy if exists "Los duenos pueden registrar pagos" on public.pagos;
drop policy if exists "Los participantes pueden actualizar pagos" on public.pagos;
revoke insert, update, delete on table public.pagos from authenticated;
grant select on table public.pagos to authenticated;

-- El precio que se cobrara tampoco puede alterarse directamente desde el cliente.
revoke insert, update, delete on table public.paseos from authenticated;
grant select on table public.paseos to authenticated;

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
            'Tu paseo fue aceptado. Ya puedes confirmar el pago desde Pagos.',
            new.id_paseo
        );
    end if;

    return new;
end;
$$;

revoke all on function public.crear_pago_al_confirmar_paseo() from public;

create trigger crear_pago_al_confirmar_paseo
    after update of estado on public.paseos
    for each row execute function public.crear_pago_al_confirmar_paseo();

-- Cubre paseos confirmados antes de aplicar esta migracion.
alter table public.pagos disable trigger exigir_usuario_verificado;

insert into public.pagos (
    id_paseo,
    monto,
    comision_plataforma,
    metodo_pago
)
select
    p.id_paseo,
    p.precio,
    round(p.precio * 0.15),
    'Pendiente'
from public.paseos p
where p.estado = 'confirmado'
on conflict (id_paseo) do nothing;

alter table public.pagos enable trigger exigir_usuario_verificado;

create or replace function public.procesar_pago(
    p_id_paseo uuid,
    p_id_metodo_pago uuid
)
returns public.estado_pago
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_precio numeric(10, 2);
    v_estado_paseo public.estado_paseo;
    v_marca text;
    v_ultimos4 text;
    v_exp_mes smallint;
    v_exp_ano smallint;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    select p.precio, p.estado
    into v_precio, v_estado_paseo
    from public.paseos p
    where p.id_paseo = p_id_paseo
      and p.id_dueno = v_usuario_id
    for update;

    if not found then
        raise exception 'El paseo no existe o no pertenece a tu cuenta';
    end if;

    if v_estado_paseo <> 'confirmado' then
        raise exception 'El paseo debe estar confirmado para pagarlo';
    end if;

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

    insert into public.pagos (
        id_paseo,
        monto,
        comision_plataforma,
        metodo_pago
    ) values (
        p_id_paseo,
        v_precio,
        round(v_precio * 0.15),
        'Pendiente'
    )
    on conflict (id_paseo) do nothing;

    perform 1
    from public.pagos
    where id_paseo = p_id_paseo
    for update;

    if exists (
        select 1 from public.pagos
        where id_paseo = p_id_paseo and estado_pago = 'pagado'
    ) then
        raise exception 'El paseo ya esta pagado';
    end if;

    update public.pagos
    set monto = v_precio,
        comision_plataforma = round(v_precio * 0.15),
        id_metodo_pago = p_id_metodo_pago,
        metodo_pago = v_marca || ' •••• ' || v_ultimos4,
        estado_pago = 'pagado',
        fecha_pago = now()
    where id_paseo = p_id_paseo;

    return 'pagado'::public.estado_pago;
end;
$$;

revoke all on function public.procesar_pago(uuid, uuid) from public;
grant execute on function public.procesar_pago(uuid, uuid) to authenticated;

create or replace function public.listar_pagos_dueno()
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
    fecha_pago timestamptz
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
        pg.fecha_pago
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_paseador
    where p.id_dueno = (select auth.uid())
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
$$;

revoke all on function public.listar_pagos_dueno() from public;
grant execute on function public.listar_pagos_dueno() to authenticated;

create or replace function public.listar_ganancias_paseador()
returns table (
    id_pago uuid,
    fecha date,
    mascota text,
    dueno text,
    bruto numeric,
    comision numeric,
    neto numeric,
    estado_pago public.estado_pago
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        pg.id_pago,
        p.fecha,
        m.nombre::text,
        coalesce(nullif(trim(pu.nombre), ''), 'Dueno')::text,
        pg.monto,
        pg.comision_plataforma,
        pg.monto - pg.comision_plataforma,
        pg.estado_pago
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    where p.id_paseador = (select auth.uid())
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
$$;

revoke all on function public.listar_ganancias_paseador() from public;
grant execute on function public.listar_ganancias_paseador() to authenticated;

create or replace function public.listar_finanzas_admin()
returns table (
    id_pago uuid,
    fecha date,
    mascota text,
    dueno text,
    paseador text,
    bruto numeric,
    comision numeric,
    neto_paseador numeric,
    estado_pago public.estado_pago
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
        pg.estado_pago
    from public.pagos pg
    inner join public.paseos p on p.id_paseo = pg.id_paseo
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu_dueno on pu_dueno.id_usuario = p.id_dueno
    left join public.perfil_usuario pu_paseador on pu_paseador.id_usuario = p.id_paseador
    order by coalesce(pg.fecha_pago, pg.creado_en) desc;
end;
$$;

revoke all on function public.listar_finanzas_admin() from public;
grant execute on function public.listar_finanzas_admin() to authenticated;
