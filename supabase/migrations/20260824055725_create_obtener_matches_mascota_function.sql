-- ============================================================
-- RPC: OBTENER REPORTES QUE COINCIDEN CON UNA MASCOTA
-- ============================================================

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
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
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
        mp.id_reporte,
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
        on mp.id_reporte = mt.id_reporte

    where mt.id_mascota = p_id_mascota

    order by
        mt.puntaje_coincidencia desc,
        mt.fecha_match desc;

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.obtener_matches_mascota(uuid)
from public;


grant execute
on function public.obtener_matches_mascota(uuid)
to authenticated;