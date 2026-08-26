-- El registro puede consultar zonas, pero solo administracion puede gestionarlas.

create unique index if not exists zonas_nombre_canton_provincia_unique
on public.zonas (lower(nombre), lower(canton), lower(provincia));

alter table public.zonas enable row level security;

revoke all on table public.zonas from anon, authenticated;
grant select on table public.zonas to anon, authenticated;
grant insert, update, delete on table public.zonas to authenticated;

create policy "Las zonas son publicas"
on public.zonas for select
to anon, authenticated
using (true);

create policy "Administradores pueden crear zonas"
on public.zonas for insert
to authenticated
with check (
    (select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'
);

create policy "Administradores pueden actualizar zonas"
on public.zonas for update
to authenticated
using (
    (select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'
)
with check (
    (select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'
);

create policy "Administradores pueden eliminar zonas"
on public.zonas for delete
to authenticated
using (
    (select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'
);
