-- ============================================================
-- ENUM: ESTADO DEL MATCH
-- ============================================================

create type public.estado_match as enum (
    'pendiente',
    'confirmado',
    'descartado'
);


-- ============================================================
-- TABLA: MATCHES
-- ============================================================

create table public.matches (
    id_match uuid primary key
        default gen_random_uuid(),

    id_reporte uuid not null
        references public.mascotas_perdidas(id_reporte)
        on delete cascade,

    id_mascota uuid not null
        references public.mascotas(id_mascota)
        on delete cascade,

    puntaje_coincidencia numeric not null,

    estado public.estado_match
        not null
        default 'pendiente',

    fecha_match timestamptz
        not null
        default now(),

    unique (id_reporte, id_mascota)
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index matches_id_reporte_idx
on public.matches(id_reporte);

create index matches_id_mascota_idx
on public.matches(id_mascota);

create index matches_estado_idx
on public.matches(estado);