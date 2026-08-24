-- ============================================================
-- OPERACIÓN ADMINISTRATIVA:
-- APROBAR O RECHAZAR UN PASEADOR
-- ============================================================

create or replace function public.verificar_paseador(
    p_id_usuario uuid,
    p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_is_admin boolean;
begin
    -- --------------------------------------------------------
    -- Verificar que quien ejecuta la operación sea admin.
    -- --------------------------------------------------------

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

    if not v_is_admin then
        raise exception 'No tiene permisos para verificar paseadores';
    end if;


    -- --------------------------------------------------------
    -- Solamente se permiten estos dos resultados.
    -- --------------------------------------------------------

    if p_estado not in ('aprobado', 'rechazado') then
        raise exception
            'Estado de verificación no permitido';
    end if;


    -- --------------------------------------------------------
    -- Comprobar que el perfil de paseador exista.
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.paseadores
        where id_usuario = p_id_usuario
    ) then
        raise exception 'El paseador no existe';
    end if;


    -- --------------------------------------------------------
    -- Actualizar estado.
    -- --------------------------------------------------------

    update public.paseadores
    set estado_verificacion =
        p_estado::public.estado_verificacion_paseador
    where id_usuario = p_id_usuario;
end;
$$;


-- ============================================================
-- PERMISOS
-- ============================================================

revoke all
on function public.verificar_paseador(uuid, text)
from public;

grant execute
on function public.verificar_paseador(uuid, text)
to authenticated;