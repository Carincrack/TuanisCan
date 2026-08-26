create table public.mensajes (
    id_mensaje uuid primary key default gen_random_uuid(),
    id_paseo uuid not null references public.paseos(id_paseo) on delete cascade,
    id_remitente uuid not null references public.usuarios(id_usuario) on delete cascade,
    id_destinatario uuid not null references public.usuarios(id_usuario) on delete cascade,
    contenido text not null check (length(trim(contenido)) > 0),
    leido boolean not null default false,
    fecha_envio timestamptz not null default now(),
    check (id_remitente <> id_destinatario)
);

create index mensajes_id_paseo_idx
    on public.mensajes(id_paseo);

create index mensajes_id_destinatario_leido_idx
    on public.mensajes(id_destinatario, leido);

alter table public.mensajes enable row level security;
grant select, insert, update on public.mensajes to authenticated;

create policy "Los participantes pueden ver mensajes del paseo"
    on public.mensajes for select to authenticated
    using (
        auth.uid() = id_remitente
        or auth.uid() = id_destinatario
    );

create policy "Los participantes pueden enviar mensajes"
    on public.mensajes for insert to authenticated
    with check (
        auth.uid() = id_remitente
        and exists (
            select 1
            from public.paseos
            where paseos.id_paseo = mensajes.id_paseo
              and (
                  (paseos.id_dueno = mensajes.id_remitente
                   and paseos.id_paseador = mensajes.id_destinatario)
                  or
                  (paseos.id_dueno = mensajes.id_destinatario
                   and paseos.id_paseador = mensajes.id_remitente)
              )
        )
    );

create policy "El destinatario puede marcar mensajes como leidos"
    on public.mensajes for update to authenticated
    using (auth.uid() = id_destinatario)
    with check (auth.uid() = id_destinatario);
