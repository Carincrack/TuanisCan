-- ============================================================
-- ENUM: ESTADO DE VERIFICACIÓN DEL PASEADOR
-- ============================================================

create type public.estado_verificacion_paseador as enum (
    'pendiente',
    'aprobado',
    'rechazado'
);


-- ============================================================
-- TABLA: PASEADORES
-- ============================================================

create table public.paseadores (
    id_usuario uuid primary key
        references public.usuarios(id_usuario)
        on delete cascade,

    descripcion text,

    tarifa_base numeric(10, 2)
        check (tarifa_base >= 0),

    calificacion_promedio numeric(3, 2)
        not null
        default 0
        check (
            calificacion_promedio >= 0
            and calificacion_promedio <= 5
        ),

    estado_verificacion public.estado_verificacion_paseador
        not null
        default 'pendiente',

    disponible boolean
        not null
        default false,

    documentos_verificacion text
);