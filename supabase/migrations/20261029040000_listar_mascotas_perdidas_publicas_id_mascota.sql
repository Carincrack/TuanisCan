-- Cuando alguien reporta una mascota encontrada (no la suya, sin
-- dueño identificado), el reporte no tiene id_mascota y el nombre
-- queda en el valor por defecto "Mascota encontrada" (ver
-- reportar_mascota_perdida). La vitrina pública lo mostraba como si
-- fuera el nombre real de la mascota. Se agrega id_mascota al RPO
-- para que el frontend pueda distinguir el caso y mostrar una frase
-- en vez de un nombre inventado.

drop function if exists public.listar_mascotas_perdidas_publicas();

create function public.listar_mascotas_perdidas_publicas()
returns table (
    id_mascota_perdida uuid,
    id_mascota uuid,
    nombre text,
    especie text,
    raza text,
    foto text,
    fecha_reporte timestamptz,
    zona_id uuid,
    zona_nombre text,
    zona_canton text,
    zona_provincia text,
    zona_distrito text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        mp.id_mascota_perdida,
        mp.id_mascota,
        mp.nombre,
        mp.especie,
        mp.raza,
        mp.foto,
        mp.fecha_reporte,
        z.id_zona,
        z.nombre,
        z.canton,
        z.provincia,
        z.distrito
    from public.mascotas_perdidas mp
    left join public.zonas z on z.id_zona = mp.zona_id
    where mp.estado = 'perdida'
    order by mp.fecha_reporte desc
    limit 60;
$$;

revoke all on function public.listar_mascotas_perdidas_publicas() from public;
grant execute on function public.listar_mascotas_perdidas_publicas() to anon, authenticated;
