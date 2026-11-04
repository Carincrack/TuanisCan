-- La agenda del paseador expone sus paseos confirmados y en curso,
-- con el nombre de la mascota y del dueño. El paseador no tiene acceso
-- directo a esas tablas por RLS (solo ve sus propias filas en paseos),
-- así que necesita una función de solo lectura igual al patrón de
-- listar_historial_paseador, pero sin filtrar por estado finalizado.
create or replace function public.listar_agenda_paseador()
returns table (
    id_paseo uuid,
    mascota text,
    foto text,
    dueno text,
    zona text,
    fecha date,
    hora_inicio time,
    duracion_min integer,
    precio numeric,
    estado public.estado_paseo
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
        coalesce(z.nombre, 'Sin zona')::text,
        p.fecha,
        p.hora_inicio,
        p.duracion_min,
        p.precio,
        p.estado
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    left join public.zonas z on z.id_zona = p.zona_id
    where p.id_paseador = (select auth.uid())
      and p.estado in ('confirmado', 'en_curso')
      and public.usuario_actual_activo()
    order by p.fecha, p.hora_inicio;
$$;

revoke all on function public.listar_agenda_paseador() from public;
grant execute on function public.listar_agenda_paseador() to authenticated;
