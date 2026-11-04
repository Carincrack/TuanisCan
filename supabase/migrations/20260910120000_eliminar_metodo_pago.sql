-- Eliminar un metodo de pago. Nunca se edita una tarjeta -no es comun ni
-- seguro cambiar el numero o la marca de algo ya guardado-, asi que la
-- unica operacion nueva es borrarla. Un dueno debe conservar siempre al
-- menos una tarjeta registrada, y si la que se borra era la principal,
-- la siguiente por antiguedad pasa a serlo para no dejar el sistema sin
-- una tarjeta principal.
create or replace function public.eliminar_metodo_pago(
    p_id_metodo_pago uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_era_principal boolean;
    v_total integer;
    v_siguiente_id uuid;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    perform pg_advisory_xact_lock(hashtext(v_usuario_id::text));

    select es_principal
    into v_era_principal
    from public.metodos_pago
    where id_metodo_pago = p_id_metodo_pago
      and id_usuario = v_usuario_id
    for update;

    if not found then
        raise exception 'Metodo de pago no encontrado';
    end if;

    select count(*)
    into v_total
    from public.metodos_pago
    where id_usuario = v_usuario_id;

    if v_total <= 1 then
        raise exception 'Debes conservar al menos una tarjeta registrada';
    end if;

    delete from public.metodos_pago
    where id_metodo_pago = p_id_metodo_pago
      and id_usuario = v_usuario_id;

    if v_era_principal then
        select id_metodo_pago
        into v_siguiente_id
        from public.metodos_pago
        where id_usuario = v_usuario_id
        order by creado_en asc
        limit 1;

        update public.metodos_pago
        set es_principal = true
        where id_metodo_pago = v_siguiente_id;
    end if;
end;
$$;

revoke all on function public.eliminar_metodo_pago(uuid) from public;
grant execute on function public.eliminar_metodo_pago(uuid) to authenticated;
