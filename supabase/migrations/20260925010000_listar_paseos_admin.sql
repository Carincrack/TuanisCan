create or replace function public.listar_paseos_admin()
returns table (
    id_paseo uuid,
    mascota text,
    dueno text,
    paseador text,
    fecha date,
    hora_inicio time,
    duracion_min integer,
    estado public.estado_paseo,
    precio numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.es_admin_actual() then
        raise exception 'Acceso denegado';
    end if;

    return query
    select
        p.id_paseo,
        m.nombre::text,
        coalesce(nullif(trim(pu_dueno.nombre), ''), 'Dueno')::text,
        coalesce(nullif(trim(pu_paseador.nombre), ''), 'Sin asignar')::text,
        p.fecha,
        p.hora_inicio,
        p.duracion_min,
        p.estado,
        p.precio
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu_dueno on pu_dueno.id_usuario = p.id_dueno
    left join public.perfil_usuario pu_paseador on pu_paseador.id_usuario = p.id_paseador
    order by p.fecha desc, p.hora_inicio desc;
end;
$$;

revoke all on function public.listar_paseos_admin() from public;
grant execute on function public.listar_paseos_admin() to authenticated;
