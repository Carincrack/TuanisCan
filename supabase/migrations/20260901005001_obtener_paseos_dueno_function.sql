create or replace function public.obtener_paseos_dueno(p_id_usuario uuid)
returns setof json
language plpgsql
security definer set search_path = public
as $$
begin
    return query
    select
        json_build_object(
            'id_paseo', p.id_paseo,
            'id_mascota', p.id_mascota,
            'id_dueno', p.id_dueno,
            'id_paseador', p.id_paseador,
            'zona_id', p.zona_id,
            'fecha', p.fecha,
            'hora_inicio', p.hora_inicio,
            'hora_fin', p.hora_fin,
            'duracion_min', p.duracion_min,
            'estado', p.estado,
            'precio', p.precio,
            'direccion_encuentro', p.direccion_encuentro,
            'mascota', case when m.id_mascota is not null then json_build_object(
                'id_mascota', m.id_mascota,
                'nombre', m.nombre,
                'foto', m.foto
            ) else null end,
            'paseador', case when pw.id_usuario is not null then json_build_object(
                'id_usuario', pw.id_usuario,
                'nombre', pu.nombre,
                'foto', pu.foto_perfil
            ) else null end,
            'zona', case when z.id_zona is not null then json_build_object(
                'id_zona', z.id_zona,
                'nombre', z.nombre,
                'canton', z.canton,
                'provincia', z.provincia
            ) else null end
        )
    from public.paseos p
    left join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.paseadores pw on pw.id_usuario = p.id_paseador
    left join public.perfil_usuario pu on pu.id_usuario = pw.id_usuario
    left join public.zonas z on z.id_zona = p.zona_id
    where p.id_dueno = p_id_usuario
    order by p.fecha desc, p.hora_inicio desc;
end;
$$;

revoke all on function public.obtener_paseos_dueno(uuid) from public;
grant execute on function public.obtener_paseos_dueno(uuid) to authenticated;
