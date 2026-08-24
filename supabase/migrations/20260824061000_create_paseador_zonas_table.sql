create table public.paseador_zonas (
    id_paseador_zonas uuid primary key default gen_random_uuid(),
    id_paseador uuid not null references public.paseadores(id_usuario) on delete cascade,
    id_zona uuid not null references public.zonas(id_zona) on delete cascade,
    activo boolean not null default true,
    fecha_asociacion timestamptz not null default now(),
    constraint paseador_zonas_unique unique (id_paseador, id_zona)
);

create index paseador_zonas_id_paseador_idx
    on public.paseador_zonas(id_paseador);

create index paseador_zonas_id_zona_idx
    on public.paseador_zonas(id_zona);

alter table public.paseador_zonas enable row level security;
grant select, insert, update, delete on public.paseador_zonas to authenticated;

create policy "Los paseadores pueden ver sus zonas"
    on public.paseador_zonas for select to authenticated
    using (auth.uid() = id_paseador);

create policy "Los paseadores pueden asociar zonas"
    on public.paseador_zonas for insert to authenticated
    with check (auth.uid() = id_paseador);

create policy "Los paseadores pueden actualizar sus zonas"
    on public.paseador_zonas for update to authenticated
    using (auth.uid() = id_paseador)
    with check (auth.uid() = id_paseador);

create policy "Los paseadores pueden eliminar sus zonas"
    on public.paseador_zonas for delete to authenticated
    using (auth.uid() = id_paseador);