create type public.estado_pago as enum (
    'pendiente',
    'pagado',
    'reembolsado',
    'fallido'
);

create table public.pagos (
    id_pago uuid primary key default gen_random_uuid(),
    id_paseo uuid not null unique references public.paseos(id_paseo) on delete cascade,
    monto decimal(10, 2) not null check (monto > 0),
    comision_plataforma decimal(10, 2) not null default 0 check (comision_plataforma >= 0),
    metodo_pago varchar(50) not null,
    estado_pago public.estado_pago not null default 'pendiente',
    referencia_tilopay varchar(255),
    fecha_pago timestamptz
);

create index pagos_estado_pago_idx
    on public.pagos(estado_pago);

create index pagos_referencia_tilopay_idx
    on public.pagos(referencia_tilopay);

alter table public.pagos enable row level security;
grant select, insert, update on public.pagos to authenticated;

create policy "Los participantes pueden ver pagos del paseo"
    on public.pagos for select to authenticated
    using (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = pagos.id_paseo
              and (
                  paseos.id_dueno = auth.uid()
                  or paseos.id_paseador = auth.uid()
              )
        )
    );

create policy "Los duenos pueden registrar pagos"
    on public.pagos for insert to authenticated
    with check (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = pagos.id_paseo
              and paseos.id_dueno = auth.uid()
        )
    );

create policy "Los participantes pueden actualizar pagos"
    on public.pagos for update to authenticated
    using (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = pagos.id_paseo
              and (
                  paseos.id_dueno = auth.uid()
                  or paseos.id_paseador = auth.uid()
              )
        )
    )
    with check (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = pagos.id_paseo
              and (
                  paseos.id_dueno = auth.uid()
                  or paseos.id_paseador = auth.uid()
              )
        )
    );