-- ============================================================
-- ENUM: ESTADO DE MASCOTA PERDIDA
-- ============================================================

create type public.estado_mascota_perdida as enum (
    'perdida',
    'encontrada'
);


-- ============================================================
-- TABLA: MASCOTAS PERDIDAS
-- ============================================================

create table public.mascotas_perdidas (
    id_reporte uuid primary key
        default gen_random_uuid(),

    -- Puede ser NULL porque también se puede reportar
    -- una mascota que no esté registrada previamente.
    id_mascota uuid
        references public.mascotas(id_mascota)
        on delete set null,

    id_usuario_reporta uuid not null
        references public.usuarios(id_usuario)
        on delete cascade,

    zona_id uuid not null
        references public.zonas(id_zona)
        on delete restrict,

    estado public.estado_mascota_perdida
        not null
        default 'perdida',

    descripcion text not null,

    foto text not null,

    latitud numeric(9, 6) not null
        check (latitud between -90 and 90),

    longitud numeric(10, 6) not null
        check (longitud between -180 and 180),

    recompensa numeric(10, 2)
        check (
            recompensa is null
            or recompensa >= 0
        ),

    fecha_reporte timestamptz
        not null
        default now(),

    fecha_resuelto timestamptz
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index mascotas_perdidas_id_mascota_idx
on public.mascotas_perdidas(id_mascota);

create index mascotas_perdidas_usuario_idx
on public.mascotas_perdidas(id_usuario_reporta);

create index mascotas_perdidas_zona_idx
on public.mascotas_perdidas(zona_id);

create index mascotas_perdidas_estado_idx
on public.mascotas_perdidas(estado);