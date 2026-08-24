-- ============================================================
-- RLS: PUBLIC.NEGOCIOS
-- ============================================================

alter table public.negocios
enable row level security;


-- ============================================================
-- SELECT
-- Los usuarios autenticados pueden consultar el directorio.
-- ============================================================

create policy "negocios_select_authenticated"
on public.negocios
for select
to authenticated
using (true);


-- ============================================================
-- UPDATE - PROPIETARIO
-- ============================================================

create policy "negocios_update_own"
on public.negocios
for update
to authenticated
using (
    id_propietario = (select auth.uid())
)
with check (
    id_propietario = (select auth.uid())
);


-- ============================================================
-- UPDATE - ADMIN
-- ============================================================

create policy "admin_update_all_negocios"
on public.negocios
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
-- DELETE - SOLO ADMIN
-- ============================================================

create policy "admin_delete_negocios"
on public.negocios
for delete
to authenticated
using (
    (
        (select auth.jwt())
        -> 'app_metadata'
        ->> 'app_role'
    ) = 'admin'
);


-- ============================================================
-- PROTECCIÓN DE CAMPOS SENSIBLES
-- ============================================================

create or replace function public.protect_negocio_system_fields()
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

    -- El identificador del negocio nunca puede cambiar.
    if new.id_negocio is distinct from old.id_negocio then
        raise exception 'No se puede modificar id_negocio';
    end if;

    -- Un propietario normal no puede transferir el negocio
    -- a otra cuenta.
    if not is_admin
       and new.id_propietario is distinct from old.id_propietario then
        raise exception
            'No tiene permiso para modificar id_propietario';
    end if;

    -- El estado destacado es administrado por la plataforma.
    if not is_admin
       and new.destacado is distinct from old.destacado then
        raise exception
            'No tiene permiso para modificar destacado';
    end if;

    return new;
end;
$$;


create trigger protect_negocio_system_fields
before update on public.negocios
for each row
execute function public.protect_negocio_system_fields();