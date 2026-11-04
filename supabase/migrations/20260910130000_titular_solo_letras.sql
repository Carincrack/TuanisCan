-- El nombre del titular es un nombre, no un texto libre: nada de digitos
-- ni simbolos. El frontend ya limpia el campo mientras se escribe, pero
-- la funcion es la unica puerta real -cualquiera puede llamar al RPC
-- directo- asi que el rechazo va tambien aqui.
create or replace function public.registrar_metodo_pago(
    p_titular text,
    p_marca text,
    p_ultimos4 text,
    p_exp_mes integer,
    p_exp_ano integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_metodo_id uuid;
    v_es_principal boolean;
    v_titular text := trim(coalesce(p_titular, ''));
begin
    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo()
       or not public.usuario_actual_verificado()
       or not exists (
            select 1 from public.duenos where id_usuario = v_usuario_id
       ) then
        raise exception 'La cuenta no esta habilitada para registrar tarjetas';
    end if;

    if char_length(v_titular) not between 3 and 120 then
        raise exception 'Indica el nombre del titular';
    end if;

    if v_titular !~ '^[[:alpha:] ''\-]+$' then
        raise exception 'El nombre del titular solo puede tener letras';
    end if;

    if p_marca not in ('Visa', 'Mastercard') then
        raise exception 'Marca de tarjeta no permitida';
    end if;

    if p_ultimos4 is null or p_ultimos4 !~ '^[0-9]{4}$' then
        raise exception 'Ultimos cuatro digitos invalidos';
    end if;

    if p_exp_mes not between 1 and 12
       or p_exp_ano < extract(year from current_date)::integer
       or (
            p_exp_ano = extract(year from current_date)::integer
            and p_exp_mes < extract(month from current_date)::integer
       ) then
        raise exception 'La tarjeta esta vencida';
    end if;

    perform pg_advisory_xact_lock(hashtext(v_usuario_id::text));

    select not exists (
        select 1
        from public.metodos_pago
        where id_usuario = v_usuario_id
    ) into v_es_principal;

    insert into public.metodos_pago (
        id_usuario,
        titular,
        marca,
        ultimos4,
        exp_mes,
        exp_ano,
        es_principal
    ) values (
        v_usuario_id,
        v_titular,
        p_marca,
        p_ultimos4,
        p_exp_mes,
        p_exp_ano,
        v_es_principal
    )
    returning id_metodo_pago into v_metodo_id;

    return v_metodo_id;
end;
$$;

revoke all on function public.registrar_metodo_pago(text, text, text, integer, integer) from public;
grant execute on function public.registrar_metodo_pago(text, text, text, integer, integer) to authenticated;
