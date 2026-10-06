-- ============================================================
-- COINCIDENCIAS: tres funciones que se quedaron con el nombre viejo
-- ============================================================
--
-- `20260831004500_rename_lost_pet_report_id` renombró
-- `mascotas_perdidas.id_reporte` a `id_mascota_perdida`.
-- `20260927050000_fix_generar_matches_reporte` ya arregló la función
-- que CREA las coincidencias, pero estas tres —las que las LEEN y las
-- RESUELVEN— siguieron apuntando a la columna vieja:
--
--   · obtener_matches_mascota   select mp.id_reporte / join por mp.id_reporte
--   · obtener_matches_reporte   where mp.id_reporte = …
--   · resolver_match            update mascotas_perdidas where id_reporte = …
--
-- Resultado: cada llamada fallaba con «column mp.id_reporte does not
-- exist» y PostgREST respondía 400. La pantalla de mascotas perdidas
-- se tragaba el error (`.catch(() => [])`), así que nadie lo veía:
-- la consola se llenaba de 400 —una llamada por mascota, cada vez
-- que se refrescaba la sesión— y la sección de coincidencias quedaba
-- vacía para siempre.
--
-- `matches.id_reporte` NO se renombró: sigue siendo la llave hacia el
-- reporte. Lo único que cambia es el lado de `mascotas_perdidas`.
--
-- Mismas firmas, mismos tipos de retorno, mismos permisos y misma
-- lógica que las originales; solo cambia el nombre de la columna.
-- No borra nada.
-- ============================================================


-- ── obtener_matches_mascota ─────────────────────────────────

create or replace function public.obtener_matches_mascota(
    p_id_mascota uuid
)
returns table (
    id_match uuid,
    id_reporte uuid,
    especie text,
    descripcion text,
    foto text,
    zona_id uuid,
    latitud numeric,
    longitud numeric,
    recompensa numeric,
    fecha_reporte timestamptz,
    puntaje_coincidencia numeric,
    estado_match public.estado_match,
    estado_reporte public.estado_mascota_perdida
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    v_is_admin := coalesce(
        (((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'),
        false
    );

    -- Solo el dueño de la mascota o el admin
    -- pueden consultar sus coincidencias.
    if not v_is_admin
       and not exists (
            select 1
            from public.mascotas m
            where m.id_mascota = p_id_mascota
              and m.id_dueno = v_usuario_id
       ) then
        raise exception
            'No tiene permisos para consultar los matches de esta mascota';
    end if;

    return query
    select
        mt.id_match,
        mp.id_mascota_perdida,
        mp.especie::text,
        mp.descripcion,
        mp.foto,
        mp.zona_id,
        mp.latitud,
        mp.longitud,
        mp.recompensa,
        mp.fecha_reporte,
        mt.puntaje_coincidencia,
        mt.estado,
        mp.estado
    from public.matches mt
    inner join public.mascotas_perdidas mp
        on mp.id_mascota_perdida = mt.id_reporte
    where mt.id_mascota = p_id_mascota
    order by
        mt.puntaje_coincidencia desc,
        mt.fecha_match desc;

end;
$$;

revoke all on function public.obtener_matches_mascota(uuid) from public;
grant execute on function public.obtener_matches_mascota(uuid) to authenticated;


-- ── obtener_matches_reporte ─────────────────────────────────

create or replace function public.obtener_matches_reporte(
    p_id_reporte uuid
)
returns table (
    id_match uuid,
    id_mascota uuid,
    nombre text,
    especie text,
    raza text,
    sexo text,
    color text,
    foto text,
    puntaje_coincidencia numeric,
    estado public.estado_match,
    fecha_match timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    v_is_admin := coalesce(
        (((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'),
        false
    );

    -- Solo puede consultar quien creó el reporte o un administrador.
    if not v_is_admin
       and not exists (
            select 1
            from public.mascotas_perdidas mp
            where mp.id_mascota_perdida = p_id_reporte
              and mp.id_usuario_reporta = v_usuario_id
       ) then
        raise exception
            'No tiene permisos para consultar los matches de este reporte';
    end if;

    return query
    select
        mt.id_match,
        m.id_mascota,
        m.nombre::text,
        m.especie::text,
        m.raza::text,
        m.sexo::text,
        m.color::text,
        m.foto,
        mt.puntaje_coincidencia,
        mt.estado,
        mt.fecha_match
    from public.matches mt
    inner join public.mascotas m
        on m.id_mascota = mt.id_mascota
    where mt.id_reporte = p_id_reporte
    order by
        mt.puntaje_coincidencia desc,
        mt.fecha_match desc;

end;
$$;

revoke all on function public.obtener_matches_reporte(uuid) from public;
grant execute on function public.obtener_matches_reporte(uuid) to authenticated;


-- ── resolver_match ──────────────────────────────────────────

create or replace function public.resolver_match(
    p_id_match uuid,
    p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_is_admin boolean;
    v_match record;
begin

    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    v_is_admin := coalesce(
        (((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin'),
        false
    );

    if p_estado not in ('confirmado', 'descartado') then
        raise exception 'Estado de match no permitido';
    end if;

    select
        mt.id_match,
        mt.id_reporte,
        mt.id_mascota,
        mt.estado,
        m.id_dueno
    into v_match
    from public.matches mt
    inner join public.mascotas m
        on m.id_mascota = mt.id_mascota
    where mt.id_match = p_id_match;

    if not found then
        raise exception 'El match no existe';
    end if;

    if not v_is_admin
       and v_match.id_dueno <> v_usuario_id then
        raise exception
            'No tiene permisos para resolver este match';
    end if;

    if v_match.estado <> 'pendiente' then
        raise exception
            'El match ya fue resuelto';
    end if;

    -- Descartar
    if p_estado = 'descartado' then
        update public.matches
        set estado = 'descartado'
        where id_match = p_id_match;
        return;
    end if;

    -- Confirmar
    update public.matches
    set estado = 'confirmado'
    where id_match = p_id_match;

    -- Vincular el reporte con la mascota registrada.
    -- (El único cambio: `id_reporte` → `id_mascota_perdida`. El valor
    -- sigue saliendo de `matches.id_reporte`, que no se renombró.)
    update public.mascotas_perdidas
    set id_mascota = v_match.id_mascota
    where id_mascota_perdida = v_match.id_reporte;

    -- Los demás candidatos del mismo reporte dejan de ser válidos.
    update public.matches
    set estado = 'descartado'
    where id_reporte = v_match.id_reporte
      and id_match <> p_id_match
      and estado = 'pendiente';

end;
$$;

revoke all on function public.resolver_match(uuid, text) from public;
grant execute on function public.resolver_match(uuid, text) to authenticated;
