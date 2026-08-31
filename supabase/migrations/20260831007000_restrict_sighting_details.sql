drop policy if exists "avistamientos_select_authenticated" on public.avistamientos;

create policy "avistamientos_select_owner_or_author"
on public.avistamientos
for select
to authenticated
using (
    id_usuario = auth.uid()
    or exists (
        select 1
        from public.mascotas_perdidas mp
        where mp.id_mascota_perdida = avistamientos.id_reporte
          and mp.id_usuario_reporta = auth.uid()
    )
    or (((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin')
);
