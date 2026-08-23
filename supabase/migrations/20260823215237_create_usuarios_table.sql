-- Tipos de usuario disponibles dentro de TuanisCan.
create type public.tipo_usuario as enum (
    'dueno',
    'paseador',
    'negocio',
    'admin'
);

-- Perfil público del usuario.
-- Las credenciales son administradas por Supabase Auth.
create table public.usuarios (
    id_usuario uuid primary key
        references auth.users(id)
        on delete cascade,

    nombre varchar(150) not null,

    telefono varchar(20),

    tipo_usuario public.tipo_usuario not null,

    foto_perfil text,

    fecha_registro timestamptz not null default now(),

    activo boolean not null default true,

    zona_id uuid
        references public.zonas(id_zona)
        on delete set null
);