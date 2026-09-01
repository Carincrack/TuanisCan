alter table public.avistamientos
add column if not exists zona_id uuid,
add column if not exists direccion text,
add column if not exists contacto text;

alter table public.avistamientos
drop constraint if exists avistamientos_zona_id_fkey,
add constraint avistamientos_zona_id_fkey
    foreign key (zona_id)
    references public.zonas(id_zona)
    on delete set null;

create index if not exists avistamientos_zona_id_idx
on public.avistamientos(zona_id);

notify pgrst, 'reload schema';
