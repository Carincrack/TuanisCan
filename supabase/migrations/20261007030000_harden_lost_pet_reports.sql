-- Seguridad del flujo de reportes: el cliente no es una frontera confiable.

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'mascotas-perdidas';

drop policy if exists "mascotas_perdidas_insert_own"
on public.mascotas_perdidas;

create policy "mascotas_perdidas_insert_own"
on public.mascotas_perdidas
for insert
to authenticated
with check (
    id_usuario_reporta = (select auth.uid())
    and split_part(foto, '/', 1) = (select auth.uid()::text)
    and (
        id_mascota is null
        or exists (
            select 1
            from public.mascotas m
            where m.id_mascota = mascotas_perdidas.id_mascota
              and m.id_dueno = (select auth.uid())
        )
    )
);

-- La columna del reporte fue renombrada; esta búsqueda seguía usando el nombre viejo.
create or replace function public.buscar_mascotas_perdidas_cercanas(
    p_latitud double precision,
    p_longitud double precision,
    p_radio_km double precision,
    p_zona_id uuid default null,
    p_especie text default null
)
returns table (
    id_reporte uuid,
    id_mascota uuid,
    id_usuario_reporta uuid,
    zona_id uuid,
    especie varchar,
    descripcion text,
    foto text,
    latitud numeric,
    longitud numeric,
    recompensa numeric,
    fecha_reporte timestamptz,
    distancia_km double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Usuario no autenticado';
    end if;
    if p_latitud is null or p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud inválida';
    end if;
    if p_longitud is null or p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud inválida';
    end if;
    if p_radio_km is null or p_radio_km <= 0 then
        raise exception 'El radio debe ser mayor que cero';
    end if;

    return query
    select
        mp.id_mascota_perdida,
        mp.id_mascota,
        mp.id_usuario_reporta,
        mp.zona_id,
        mp.especie,
        mp.descripcion,
        mp.foto,
        mp.latitud,
        mp.longitud,
        mp.recompensa,
        mp.fecha_reporte,
        extensions.st_distance(
            extensions.st_setsrid(extensions.st_makepoint(mp.longitud::double precision, mp.latitud::double precision), 4326)::extensions.geography,
            extensions.st_setsrid(extensions.st_makepoint(p_longitud, p_latitud), 4326)::extensions.geography
        ) / 1000.0
    from public.mascotas_perdidas mp
    where mp.estado = 'perdida'
      and (p_zona_id is null or mp.zona_id = p_zona_id)
      and (p_especie is null or lower(mp.especie) = lower(trim(p_especie)))
      and extensions.st_dwithin(
          extensions.st_setsrid(extensions.st_makepoint(mp.longitud::double precision, mp.latitud::double precision), 4326)::extensions.geography,
          extensions.st_setsrid(extensions.st_makepoint(p_longitud, p_latitud), 4326)::extensions.geography,
          p_radio_km * 1000
      )
    order by distancia_km asc, mp.fecha_reporte desc;
end;
$$;

revoke all on function public.buscar_mascotas_perdidas_cercanas(double precision, double precision, double precision, uuid, text) from public;
grant execute on function public.buscar_mascotas_perdidas_cercanas(double precision, double precision, double precision, uuid, text) to authenticated;
