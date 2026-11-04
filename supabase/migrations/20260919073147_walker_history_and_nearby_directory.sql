-- El historial solo expone paseos finalizados al paseador que los realizó.
create or replace function public.listar_historial_paseador()
returns table (
    id_paseo uuid,
    mascota text,
    foto text,
    dueno text,
    fecha date,
    hora_inicio time,
    hora_fin time,
    duracion_min integer,
    precio numeric,
    zona text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id_paseo,
        m.nombre::text,
        m.foto,
        coalesce(nullif(trim(pu.nombre), ''), 'Dueño')::text,
        p.fecha,
        p.hora_inicio,
        p.hora_fin,
        p.duracion_min,
        p.precio,
        coalesce(z.nombre, 'Sin zona')::text
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    left join public.zonas z on z.id_zona = p.zona_id
    where p.id_paseador = (select auth.uid())
      and p.estado = 'finalizado'
      and public.usuario_actual_activo()
    order by p.fecha desc, p.hora_inicio desc;
$$;

revoke all on function public.listar_historial_paseador() from public;
grant execute on function public.listar_historial_paseador() to authenticated;
