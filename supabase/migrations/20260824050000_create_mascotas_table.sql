create type public.sexo_mascota as enum (
    'macho',
    'hembra'
);

create table public.mascotas (
    id_mascota uuid primary key default gen_random_uuid(),
    id_dueno uuid not null references public.usuarios(id_usuario) on delete cascade,
    nombre varchar(100) not null,
    especie varchar(50) not null,
    raza varchar(100) not null,
    sexo public.sexo_mascota not null,
    fecha_nacimiento date not null,
    peso decimal(6, 2) not null check (peso > 0),
    color varchar(100) not null,
    esterilizado boolean not null default false,
    microchip varchar(50),
    foto text,
    alergias text
);

create index mascotas_id_dueno_idx on public.mascotas(id_dueno);

alter table public.mascotas enable row level security;
grant select, insert, update, delete on public.mascotas to authenticated;

create policy "Los duenos pueden ver sus mascotas"
    on public.mascotas for select to authenticated
    using (auth.uid() = id_dueno);

create policy "Los duenos pueden registrar sus mascotas"
    on public.mascotas for insert to authenticated
    with check (auth.uid() = id_dueno);

create policy "Los duenos pueden actualizar sus mascotas"
    on public.mascotas for update to authenticated
    using (auth.uid() = id_dueno)
    with check (auth.uid() = id_dueno);

create policy "Los duenos pueden eliminar sus mascotas"
    on public.mascotas for delete to authenticated
    using (auth.uid() = id_dueno);