-- ============================================================
-- TABLA: AVISTAMIENTOS
-- ============================================================

create table public.avistamientos (
    id_avistamiento uuid primary key
        default gen_random_uuid(),

    id_reporte uuid not null
        references public.mascotas_perdidas(id_reporte)
        on delete cascade,

    id_usuario uuid not null
        references public.usuarios(id_usuario)
        on delete cascade,

    latitud numeric(9, 6) not null
        check (
            latitud between -90 and 90
        ),

    longitud numeric(10, 6) not null
        check (
            longitud between -180 and 180
        ),

    comentario text,

    fecha timestamptz not null
        default now()
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index avistamientos_id_reporte_idx
on public.avistamientos(id_reporte);


create index avistamientos_id_usuario_idx
on public.avistamientos(id_usuario);


create index avistamientos_fecha_idx
on public.avistamientos(fecha desc);