-- ============================================================
-- RLS: MATCHES
-- ============================================================

alter table public.matches
enable row level security;


-- ============================================================
-- SELECT:
-- Usuario que creó el reporte de mascota perdida
-- ============================================================

create policy "matches_select_report_owner"
on public.matches
for select
to authenticated
using (
    exists (
        select 1
        from public.mascotas_perdidas mp
        where mp.id_reporte = matches.id_reporte
          and mp.id_usuario_reporta = (select auth.uid())
    )
);


-- ============================================================
-- SELECT:
-- Dueño de la mascota registrada candidata
-- ============================================================

create policy "matches_select_pet_owner"
on public.matches
for select
to authenticated
using (
    exists (
        select 1
        from public.mascotas m
        where m.id_mascota = matches.id_mascota
          and m.id_dueno = (select auth.uid())
    )
);


-- ============================================================
-- SELECT:
-- ADMIN
-- ============================================================

create policy "admin_select_all_matches"
on public.matches
for select
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);