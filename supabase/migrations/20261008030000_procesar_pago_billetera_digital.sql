-- El pago con billetera digital nunca llegaba a la base: el frontend
-- solo simulaba la espera (setTimeout) y marcaba "pagado" en memoria,
-- sin llamar ningun RPC. Al recargar, pagos.estado_pago seguia en
-- 'pendiente' porque nunca se escribio nada.
--
-- Es el mismo flujo que procesar_pago() para tarjetas, salvo que no
-- hay fila en metodos_pago que validar: la billetera no es un medio
-- guardado, se eligen al momento de pagar.

create or replace function public.procesar_pago_billetera(
    p_id_paseo uuid,
    p_billetera text
)
returns public.estado_pago
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_precio numeric(10, 2);
    v_estado_paseo public.estado_paseo;
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if p_billetera not in ('PayPal', 'Google Pay', 'Apple Pay') then
        raise exception 'Billetera digital no soportada';
    end if;

    select p.precio, p.estado
    into v_precio, v_estado_paseo
    from public.paseos p
    where p.id_paseo = p_id_paseo
      and p.id_dueno = v_usuario_id
    for update;

    if not found then
        raise exception 'El paseo no existe o no pertenece a tu cuenta';
    end if;

    if v_estado_paseo <> 'confirmado' then
        raise exception 'El paseo debe estar confirmado para pagarlo';
    end if;

    insert into public.pagos (
        id_paseo,
        monto,
        comision_plataforma,
        metodo_pago
    ) values (
        p_id_paseo,
        v_precio,
        round(v_precio * 0.15),
        'Pendiente'
    )
    on conflict (id_paseo) do nothing;

    perform 1
    from public.pagos
    where id_paseo = p_id_paseo
    for update;

    if exists (
        select 1 from public.pagos
        where id_paseo = p_id_paseo and estado_pago = 'pagado'
    ) then
        raise exception 'El paseo ya esta pagado';
    end if;

    update public.pagos
    set monto = v_precio,
        comision_plataforma = round(v_precio * 0.15),
        id_metodo_pago = null,
        metodo_pago = p_billetera,
        estado_pago = 'pagado',
        fecha_pago = now()
    where id_paseo = p_id_paseo;

    return 'pagado'::public.estado_pago;
end;
$$;

revoke all on function public.procesar_pago_billetera(uuid, text) from public;
grant execute on function public.procesar_pago_billetera(uuid, text) to authenticated;
