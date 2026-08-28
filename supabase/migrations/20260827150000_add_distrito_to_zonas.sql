-- Agrega el distrito a la zona. Opcional para no romper el catalogo ya sembrado.
alter table public.zonas
    add column if not exists distrito varchar(100);
