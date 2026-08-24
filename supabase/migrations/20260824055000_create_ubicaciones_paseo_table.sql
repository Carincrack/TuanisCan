create table public.ubicaciones_paseo (
    id_ubicacion uuid primary key default gen_random_uuid(),
    id_paseo uuid not null references public.paseos(id_paseo) on delete cascade,
    latitud decimal(9, 6) not null check (latitud between -90 and 90),
    longitud decimal(10, 6) not null check (longitud between -180 and 180),
    timestamp timestamptz not null default now()
);

create index ubicaciones_paseo_id_paseo_idx
    on public.ubicaciones_paseo(id_paseo);

create index ubicaciones_paseo_timestamp_idx
    on public.ubicaciones_paseo(timestamp);

alter table public.ubicaciones_paseo enable row level security;
grant select, insert on public.ubicaciones_paseo to authenticated;

create policy "Los duenos pueden ver ubicaciones de sus paseos"
    on public.ubicaciones_paseo for select to authenticated
    using (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = ubicaciones_paseo.id_paseo
              and paseos.id_dueno = auth.uid()
        )
    );

create policy "Los paseadores pueden ver ubicaciones de sus paseos"
    on public.ubicaciones_paseo for select to authenticated
    using (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = ubicaciones_paseo.id_paseo
              and paseos.id_paseador = auth.uid()
        )
    );

create policy "Los paseadores pueden registrar ubicaciones"
    on public.ubicaciones_paseo for insert to authenticated
    with check (
        exists (
            select 1
            from public.paseos
            where paseos.id_paseo = ubicaciones_paseo.id_paseo
              and paseos.id_paseador = auth.uid()
        )
    );