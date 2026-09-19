-- Las reseñas solo existen cuando el servicio realmente terminó.
drop policy if exists "Los participantes pueden crear resenas" on public.resenas;
create policy "Los participantes califican paseos finalizados"
    on public.resenas for insert to authenticated
    with check (
        (select auth.uid()) = id_autor
        and exists (
            select 1 from public.paseos p
            where p.id_paseo = resenas.id_paseo
              and p.estado = 'finalizado'
              and ((p.id_dueno = resenas.id_autor and p.id_paseador = resenas.id_receptor)
                or (p.id_dueno = resenas.id_receptor and p.id_paseador = resenas.id_autor))
        )
    );

-- Un paseador solo puede publicar su GPS mientras el paseo está en curso.
drop policy if exists "Los paseadores pueden registrar ubicaciones" on public.ubicaciones_paseo;
create policy "Los paseadores registran ubicaciones de paseos en curso"
    on public.ubicaciones_paseo for insert to authenticated
    with check (
        exists (
            select 1 from public.paseos p
            where p.id_paseo = ubicaciones_paseo.id_paseo
              and p.id_paseador = (select auth.uid())
              and p.estado = 'en_curso'
        )
    );

-- Postgres Changes es suficiente para el seguimiento uno-a-uno dueño/paseador.
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ubicaciones_paseo'
    ) then
        alter publication supabase_realtime add table public.ubicaciones_paseo;
    end if;
end $$;
