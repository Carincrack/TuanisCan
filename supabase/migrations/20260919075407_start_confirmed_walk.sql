create or replace function public.iniciar_mi_paseo(p_id_paseo uuid)
returns public.estado_paseo
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dueno_id uuid;
    v_mascota text;
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not public.usuario_actual_activo() then
        raise exception 'Tu cuenta no esta habilitada';
    end if;

    select p.id_dueno, m.nombre
    into v_dueno_id, v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = p_id_paseo
      and p.id_paseador = (select auth.uid())
      and p.estado = 'confirmado'
      and p.fecha = current_date
    for update of p;

    if not found then
        raise exception 'El paseo debe estar confirmado para hoy y pertenecerte';
    end if;

    update public.paseos
    set estado = 'en_curso'
    where id_paseo = p_id_paseo;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'paseo',
        'El paseo de ' || v_mascota || ' ya inicio. Puedes ver su ubicación en tiempo real.',
        p_id_paseo
    );

    return 'en_curso'::public.estado_paseo;
end;
$$;

revoke all on function public.iniciar_mi_paseo(uuid) from public;
grant execute on function public.iniciar_mi_paseo(uuid) to authenticated;
