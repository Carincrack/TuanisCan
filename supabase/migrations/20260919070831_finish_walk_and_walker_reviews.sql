-- El estado y la hora de cierre no se exponen para escritura directa desde el navegador.
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
        'paseo',
        'El paseo de ' || v_mascota || ' finalizo. Ya puedes dejar tu resena.',
        p_id_paseo
    );

    return 'finalizado'::public.estado_paseo;
end;
$$;

revoke all on function public.finalizar_mi_paseo(uuid) from public;
grant execute on function public.finalizar_mi_paseo(uuid) to authenticated;

-- Devuelve solo las reseñas cuyo receptor es la cuenta autenticada.
-- El paseador no puede leer directamente el perfil del dueño ni su mascota.
create or replace function public.listar_resenas_paseador()
returns table (
    id_resena uuid,
    id_paseo uuid,
    dueno text,
    mascota text,
    calificacion integer,
    comentario text,
    fecha timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        r.id_resena,
        r.id_paseo,
        coalesce(nullif(trim(pu.nombre), ''), 'Dueno')::text,
        coalesce(m.nombre, 'Mascota')::text,
        r.calificacion,
        r.comentario,
        r.fecha
    from public.resenas r
    inner join public.paseos p on p.id_paseo = r.id_paseo
    left join public.perfil_usuario pu on pu.id_usuario = r.id_autor
    left join public.mascotas m on m.id_mascota = p.id_mascota
    where r.id_receptor = (select auth.uid())
      and public.usuario_actual_activo()
    order by r.fecha desc;
$$;

revoke all on function public.listar_resenas_paseador() from public;
grant execute on function public.listar_resenas_paseador() to authenticated;
