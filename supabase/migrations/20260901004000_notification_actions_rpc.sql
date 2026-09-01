create or replace function public.marcar_notificacion_leida(p_id_notificacion uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    update public.notificaciones
    set leido = true
    where id_notificacion = p_id_notificacion
      and id_usuario = auth.uid();
$$;

create or replace function public.marcar_notificaciones_leidas()
returns void
language sql
security definer
set search_path = ''
as $$
    update public.notificaciones
    set leido = true
    where id_usuario = auth.uid()
      and leido = false;
$$;

create or replace function public.eliminar_notificacion(p_id_notificacion uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.notificaciones
    where id_notificacion = p_id_notificacion
      and id_usuario = auth.uid();
$$;

create or replace function public.eliminar_notificaciones()
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.notificaciones
    where id_usuario = auth.uid();
$$;

revoke all on function public.marcar_notificacion_leida(uuid) from public;
revoke all on function public.marcar_notificaciones_leidas() from public;
revoke all on function public.eliminar_notificacion(uuid) from public;
revoke all on function public.eliminar_notificaciones() from public;

grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;
grant execute on function public.marcar_notificaciones_leidas() to authenticated;
grant execute on function public.eliminar_notificacion(uuid) to authenticated;
grant execute on function public.eliminar_notificaciones() to authenticated;
