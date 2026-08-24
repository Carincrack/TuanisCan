create type public.estado_paseo as enum (
    'solicitado',
    'confirmado',
    'en_curso',
    'finalizado',
    'cancelado'
);

create table public.paseos (
    id_paseo uuid primary key default gen_random_uuid(),
    id_mascota uuid not null references public.mascotas(id_mascota) on delete cascade,
    id_dueno uuid not null references public.usuarios(id_usuario) on delete cascade,
    id_paseador uuid references public.paseadores(id_usuario) on delete set null,
    zona_id uuid references public.zonas(id_zona) on delete set null,
    fecha date not null,
    hora_inicio time not null,
    hora_fin time,
    duracion_min integer not null check (duracion_min > 0),
    estado public.estado_paseo not null default 'solicitado',
    precio decimal(10, 2) not null check (precio >= 0),
    direccion_encuentro text not null
);

create index paseos_id_mascota_idx on public.paseos(id_mascota);
create index paseos_id_dueno_idx on public.paseos(id_dueno);
create index paseos_id_paseador_idx on public.paseos(id_paseador);

alter table public.paseos enable row level security;
grant select, insert, update, delete on public.paseos to authenticated;

create policy "Los duenos pueden ver sus paseos"
    on public.paseos for select to authenticated
    using (auth.uid() = id_dueno);

create policy "Los paseadores pueden ver sus paseos"
    on public.paseos for select to authenticated
    using (auth.uid() = id_paseador);

create policy "Los duenos pueden solicitar paseos"
    on public.paseos for insert to authenticated
    with check (auth.uid() = id_dueno);

create policy "Los duenos pueden actualizar sus paseos"
    on public.paseos for update to authenticated
    using (auth.uid() = id_dueno)
    with check (auth.uid() = id_dueno);

create policy "Los paseadores pueden actualizar sus paseos"
    on public.paseos for update to authenticated
    using (auth.uid() = id_paseador)
    with check (auth.uid() = id_paseador);

create policy "Los duenos pueden eliminar sus paseos"
    on public.paseos for delete to authenticated
    using (auth.uid() = id_dueno);