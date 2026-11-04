-- Bug: la notificación de "paseo finalizado, ya puedes dejar tu reseña"
-- se creaba con tipo 'paseo', que el front enruta a /paseos. El mensaje
-- habla de dejar una reseña, así que el tipo correcto es 'resena'
-- (enruta a /resenas o /p/resenas según el rol de quien la recibe).
create or replace function public.finalizar_mi_paseo(p_id_paseo uuid)
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
      and p.estado = 'en_curso'
    for update of p;

    if not found then
        raise exception 'El paseo no esta en curso o no te pertenece';
    end if;

    update public.paseos
    set estado = 'finalizado',
        hora_fin = localtime
    where id_paseo = p_id_paseo;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        v_dueno_id,
        'resena',
        'El paseo de ' || v_mascota || ' finalizo. Ya puedes dejar tu resena.',
        p_id_paseo
    );

    return 'finalizado'::public.estado_paseo;
end;
$$;

revoke all on function public.finalizar_mi_paseo(uuid) from public;
grant execute on function public.finalizar_mi_paseo(uuid) to authenticated;
