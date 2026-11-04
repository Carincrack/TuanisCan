-- Vitrina publica de /perdidas: mostrar mascotas reportadas como
-- perdidas sin pedir sesion. Es puramente aditivo, no toca ninguna
-- politica ni funcion existente:
--
--   · "mascotas_perdidas_select_authenticated" sigue intacta (la usa
--     la pantalla interna /mascotas-perdidas); esta vitrina usa una
--     funcion nueva, security definer, que solo expone lo que ya es
--     publico en una ficha de "se perdio esta mascota" (foto, nombre,
--     especie, raza, zona, fecha) y nunca el contacto, la descripcion
--     completa ni quien reporto.
--   · La foto sigue en el bucket privado "mascotas-perdidas"; se le
--     agrega una politica de SELECT para "anon" ademas de la que ya
--     tiene "authenticated" (sin tocar esa), porque sin ella
--     `createSignedUrl` le niega la firma a quien no tiene sesion.

create or replace function public.listar_mascotas_perdidas_publicas()
returns table (
    id_mascota_perdida uuid,
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

drop policy if exists "anon_select_mascotas_perdidas_photos" on storage.objects;
create policy "anon_select_mascotas_perdidas_photos"
on storage.objects for select to anon
using (bucket_id = 'mascotas-perdidas');
