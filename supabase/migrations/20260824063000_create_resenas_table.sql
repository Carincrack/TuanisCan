create table public.resenas (
    id_resena uuid primary key default gen_random_uuid(),
    id_paseo uuid not null references public.paseos(id_paseo) on delete cascade,
    id_autor uuid not null references public.usuarios(id_usuario) on delete cascade,
    id_receptor uuid not null references public.usuarios(id_usuario) on delete cascade,
    calificacion integer not null check (calificacion between 1 and 5),
    comentario text,
    fecha timestamptz not null default now(),
    constraint resenas_autor_receptor_distintos check (id_autor <> id_receptor),
    constraint resenas_una_por_autor_paseo unique (id_paseo, id_autor)
);

create index resenas_id_paseo_idx
    on public.resenas(id_paseo);

create index resenas_id_receptor_idx
    on public.resenas(id_receptor);

alter table public.resenas enable row level security;
grant select, insert, update, delete on public.resenas to authenticated;

create policy "Los participantes pueden ver resenas del paseo"
    on public.resenas for select to authenticated
    using (
        auth.uid() = id_autor
        or auth.uid() = id_receptor
    );

create policy "Los participantes pueden crear resenas"
    on public.resenas for insert to authenticated
    with check (
        auth.uid() = id_autor
        and exists (
            select 1
            from public.paseos
            where paseos.id_paseo = resenas.id_paseo
              and (
                  (paseos.id_dueno = resenas.id_autor
                   and paseos.id_paseador = resenas.id_receptor)
                  or
                  (paseos.id_dueno = resenas.id_receptor
                   and paseos.id_paseador = resenas.id_autor)
              )
        )
    );

create policy "Los autores pueden actualizar sus resenas"
    on public.resenas for update to authenticated
    using (auth.uid() = id_autor)
    with check (auth.uid() = id_autor);

create policy "Los autores pueden eliminar sus resenas"
    on public.resenas for delete to authenticated
    using (auth.uid() = id_autor);