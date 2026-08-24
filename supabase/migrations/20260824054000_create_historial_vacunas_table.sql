create type public.estado_vacuna as enum (
    'vigente',
    'pendiente',
    'vencida'
);

create table public.historial_vacunas (
    id_vacuna uuid primary key default gen_random_uuid(),
    id_mascota uuid not null references public.mascotas(id_mascota) on delete cascade,
    id_negocio uuid not null references public.negocios(id_negocio) on delete restrict,
    nombre_vacuna varchar(150) not null,
    fecha_aplicacion date not null,
    fecha_vencimiento date not null,
    estado public.estado_vacuna not null default 'vigente',
    check (fecha_vencimiento >= fecha_aplicacion)
);

create index historial_vacunas_id_mascota_idx
    on public.historial_vacunas(id_mascota);

create index historial_vacunas_id_negocio_idx
    on public.historial_vacunas(id_negocio);

alter table public.historial_vacunas enable row level security;
grant select, insert, update, delete on public.historial_vacunas to authenticated;

create policy "Los duenos pueden ver el historial de sus mascotas"
    on public.historial_vacunas for select to authenticated
    using (
        exists (
            select 1
            from public.mascotas
            where mascotas.id_mascota = historial_vacunas.id_mascota
              and mascotas.id_dueno = auth.uid()
        )
    );

create policy "Los negocios pueden ver sus vacunas aplicadas"
    on public.historial_vacunas for select to authenticated
    using (
        exists (
            select 1
            from public.negocios
            where negocios.id_negocio = historial_vacunas.id_negocio
              and negocios.id_propietario = auth.uid()
        )
    );

create policy "Los duenos pueden registrar vacunas"
    on public.historial_vacunas for insert to authenticated
    with check (
        exists (
            select 1
            from public.mascotas
            where mascotas.id_mascota = historial_vacunas.id_mascota
              and mascotas.id_dueno = auth.uid()
        )
    );

create policy "Los negocios pueden registrar vacunas aplicadas"
    on public.historial_vacunas for insert to authenticated
    with check (
        exists (
            select 1
            from public.negocios
            where negocios.id_negocio = historial_vacunas.id_negocio
              and negocios.id_propietario = auth.uid()
        )
    );

create policy "Los duenos pueden actualizar vacunas"
    on public.historial_vacunas for update to authenticated
    using (
        exists (
            select 1
            from public.mascotas
            where mascotas.id_mascota = historial_vacunas.id_mascota
              and mascotas.id_dueno = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.mascotas
            where mascotas.id_mascota = historial_vacunas.id_mascota
              and mascotas.id_dueno = auth.uid()
        )
    );

create policy "Los duenos pueden eliminar vacunas"
    on public.historial_vacunas for delete to authenticated
    using (
        exists (
            select 1
            from public.mascotas
            where mascotas.id_mascota = historial_vacunas.id_mascota
              and mascotas.id_dueno = auth.uid()
        )
    );