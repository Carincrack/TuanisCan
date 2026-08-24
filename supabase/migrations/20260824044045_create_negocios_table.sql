-- ============================================================
-- ENUM: TIPO DE NEGOCIO
-- ============================================================

create type public.tipo_negocio as enum (
    'veterinaria',
    'tienda',
    'refugio'
);


-- ============================================================
-- TABLA: NEGOCIOS
-- ============================================================

create table public.negocios (
    id_negocio uuid primary key
        default gen_random_uuid(),

    id_propietario uuid
        references public.usuarios(id_usuario)
        on delete set null,

    zona_id uuid
        references public.zonas(id_zona)
        on delete set null,

    nombre varchar(150) not null,

    tipo public.tipo_negocio not null,

    direccion text,

    latitud numeric(9, 6)
        check (
            latitud is null
            or latitud between -90 and 90
        ),

    longitud numeric(10, 6)
        check (
            longitud is null
            or longitud between -180 and 180
        ),

    telefono varchar(20),

    horario text,

    destacado boolean
        not null
        default false
);