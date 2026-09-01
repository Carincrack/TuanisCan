-- Agrega el distrito a la zona.
alter table public.zonas
    add column if not exists distrito varchar(100);

-- El índice anterior ya no sirve porque un cantón
-- puede tener varios distritos.
drop index if exists public.zonas_provincia_canton_unique;

-- Ahora la combinación única es:
-- provincia + canton + distrito.
create unique index if not exists zonas_provincia_canton_distrito_unique
on public.zonas (
    lower(provincia),
    lower(canton),
    lower(distrito)
);