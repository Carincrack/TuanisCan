-- ============================================================
-- RLS PARA PUBLIC.PASEADORES
-- ============================================================

alter table public.paseadores
enable row level security;


-- ============================================================
-- SELECT
-- ============================================================

-- El paseador puede consultar su propio perfil,
-- aunque todavía esté pendiente o rechazado.
create policy "paseadores_select_own"
on public.paseadores
for select
to authenticated
using (
    (select auth.uid()) = id_usuario
);


-- Los usuarios autenticados pueden consultar
-- únicamente paseadores aprobados.
create policy "paseadores_select_approved"
on public.paseadores
for select
to authenticated
using (
    estado_verificacion = 'aprobado'
);


-- El administrador puede consultar todos los paseadores.
create policy "admin_select_all_paseadores"
on public.paseadores
for select
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);


-- ============================================================
-- UPDATE
-- ============================================================

-- El paseador puede actualizar únicamente su propio perfil.
create policy "paseadores_update_own"
on public.paseadores
for update
to authenticated
using (
    (select auth.uid()) = id_usuario
)
with check (
    (select auth.uid()) = id_usuario
);


-- El administrador puede actualizar cualquier perfil.
create policy "admin_update_all_paseadores"
on public.paseadores
for update
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
)
with check (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);


-- ============================================================
-- PROTECCIÓN DE CAMPOS SENSIBLES
-- ============================================================

create or replace function public.protect_paseador_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    is_admin boolean;
begin
    is_admin := coalesce(
        (
            (
                (select auth.jwt())
                -> 'app_metadata'
                ->> 'app_role'
            ) = 'admin'
        ),
        false
    );

    -- El identificador nunca puede modificarse.
    if new.id_usuario is distinct from old.id_usuario then
        raise exception 'No se puede modificar id_usuario';
    end if;

    -- Solo el administrador puede modificar
    -- el estado de verificación.
    if not is_admin
       and new.estado_verificacion
           is distinct from old.estado_verificacion then
        raise exception
            'No tiene permiso para modificar estado_verificacion';
    end if;

    -- La calificación no puede ser modificada
    -- directamente por el propio paseador.
    if not is_admin
       and new.calificacion_promedio
           is distinct from old.calificacion_promedio then
        raise exception
            'No tiene permiso para modificar calificacion_promedio';
    end if;

    return new;
end;
$$;


create trigger protect_paseador_system_fields
before update on public.paseadores
for each row
execute function public.protect_paseador_system_fields();