-- El dueño que mira el perfil de un paseador en /paseadores solo veia
-- el promedio y el conteo de resenas, no el contenido: ningun RPC
-- publico las expone (listar_resenas_paseador es solo para el propio
-- paseador, via auth.uid() = id_receptor). Esta es la version publica,
-- limitada a paseadores visibles en el directorio (aprobados).

create or replace function public.listar_resenas_publicas_paseador(p_id_paseador uuid)
returns table (
    id_resena uuid,
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
        coalesce(nullif(trim(pu.nombre), ''), 'Dueño')::text,
        coalesce(m.nombre, 'Mascota')::text,
        r.calificacion,
        r.comentario,
        r.fecha
    from public.resenas r
    inner join public.paseos p on p.id_paseo = r.id_paseo
    left join public.perfil_usuario pu on pu.id_usuario = r.id_autor
    left join public.mascotas m on m.id_mascota = p.id_mascota
    where r.id_receptor = p_id_paseador
      and (select auth.uid()) is not null
      and exists (
          select 1 from public.paseadores pa
          inner join public.usuarios u on u.id_usuario = pa.id_usuario
          where pa.id_usuario = p_id_paseador
            and pa.estado_verificacion = 'aprobado'
            and u.estado_verificacion = 'aprobado'
            and u.activo = true
      )
    order by r.fecha desc
    limit 20;
$$;

revoke all on function public.listar_resenas_publicas_paseador(uuid) from public;
grant execute on function public.listar_resenas_publicas_paseador(uuid) to authenticated;
