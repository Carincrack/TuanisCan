grant delete on public.notificaciones to authenticated;

drop policy if exists "Los usuarios pueden eliminar sus notificaciones" on public.notificaciones;
create policy "Los usuarios pueden eliminar sus notificaciones"
    on public.notificaciones for delete to authenticated
    using (auth.uid() = id_usuario);
