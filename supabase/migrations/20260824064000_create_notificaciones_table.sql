create type public.tipo_notificacion as enum (
    'paseo',
    'mascota_perdida',
    'verificacion',
    'pago',
    'resena'
);

create table public.notificaciones (
    id_notificacion uuid primary key default gen_random_uuid(),
    id_usuario uuid not null references public.usuarios(id_usuario) on delete cascade,
    tipo public.tipo_notificacion not null,
    mensaje text not null check (length(trim(mensaje)) > 0),
    leido boolean not null default false,
    referencia_id uuid,
    fecha timestamptz not null default now()
);

create index notificaciones_id_usuario_idx
    on public.notificaciones(id_usuario);

create index notificaciones_usuario_leido_idx
    on public.notificaciones(id_usuario, leido);

create index notificaciones_fecha_idx
    on public.notificaciones(fecha desc);

alter table public.notificaciones enable row level security;
grant select, update on public.notificaciones to authenticated;

create policy "Los usuarios pueden ver sus notificaciones"
    on public.notificaciones for select to authenticated
    using (auth.uid() = id_usuario);

create policy "Los usuarios pueden marcar sus notificaciones"
    on public.notificaciones for update to authenticated
    using (auth.uid() = id_usuario)
    with check (auth.uid() = id_usuario);