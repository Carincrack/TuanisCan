-- ============================================================
-- RLS: AVISTAMIENTOS
-- ============================================================

alter table public.avistamientos
enable row level security;


-- ============================================================
-- SELECT
-- Los usuarios autenticados pueden consultar avistamientos
-- para mostrarlos en el mapa/feed.
-- ============================================================

create policy "avistamientos_select_authenticated"
on public.avistamientos
for select
to authenticated
using (true);