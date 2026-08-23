-- Extensión necesaria para trabajar con información geoespacial.
create extension if not exists postgis with schema extensions;

-- Tabla de zonas geográficas utilizadas por la aplicación.
create table public.zonas (
    id_zona uuid primary key default gen_random_uuid(),

    nombre varchar(100) not null,

    canton varchar(100) not null,

    provincia varchar(100) not null,

    poligono_cobertura extensions.geometry(Polygon, 4326)
);