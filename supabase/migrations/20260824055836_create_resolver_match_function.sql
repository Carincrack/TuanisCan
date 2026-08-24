-- ============================================================
-- RPC: CONFIRMAR O DESCARTAR MATCH
-- ============================================================

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
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
        false
    );


    -- Estados permitidos desde esta operación.
    if p_estado not in ('confirmado', 'descartado') then
        raise exception 'Estado de match no permitido';
    end if;


    -- Obtener el match y el dueño de la mascota candidata.
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


    -- Solamente el dueño de la mascota candidata
    -- o el admin puede resolver el match.
    if not v_is_admin
       and v_match.id_dueno <> v_usuario_id then

        raise exception
            'No tiene permisos para resolver este match';

    end if;


    -- Un match resuelto no puede cambiarse nuevamente.
    if v_match.estado <> 'pendiente' then
        raise exception
            'El match ya fue resuelto';
    end if;


    -- ========================================================
    -- DESCARTAR
    -- ========================================================

    if p_estado = 'descartado' then

        update public.matches
        set estado = 'descartado'
        where id_match = p_id_match;

        return;

    end if;


    -- ========================================================
    -- CONFIRMAR
    -- ========================================================

    update public.matches
    set estado = 'confirmado'
    where id_match = p_id_match;


    -- Vincular el reporte con la mascota registrada.
    update public.mascotas_perdidas
    set id_mascota = v_match.id_mascota
    where id_reporte = v_match.id_reporte;


    -- Los demás candidatos del mismo reporte
    -- dejan de ser válidos.
    update public.matches
    set estado = 'descartado'
    where id_reporte = v_match.id_reporte
      and id_match <> p_id_match
      and estado = 'pendiente';

end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.resolver_match(uuid, text)
from public;


grant execute
on function public.resolver_match(uuid, text)
to authenticated;