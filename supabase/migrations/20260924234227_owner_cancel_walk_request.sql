-- El dueno puede cancelar una solicitud de paseo mientras el paseador
-- no la haya respondido. Se avisa al paseador para que no la busque.

create or replace function public.cancelar_solicitud_paseo(p_id_paseo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_paseador_id uuid;
    v_mascota text;
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    select p.id_paseador, m.nombre
    into v_paseador_id, v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_dueno = auth.uid()
      and p.estado = 'solicitado'
    for update of p;

    if not found then
        raise exception 'La solicitud no existe o el paseador ya la respondio';
    end if;

    update public.paseos
    set estado = 'cancelado'
    where id_paseo = p_id_paseo;

    if v_paseador_id is not null then
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            v_paseador_id,
            'paseo',
            'El dueno de ' || v_mascota || ' cancelo la solicitud de paseo.',
            p_id_paseo
        );
    end if;
end;
$$;

revoke all on function public.cancelar_solicitud_paseo(uuid) from public;
grant execute on function public.cancelar_solicitud_paseo(uuid) to authenticated;
