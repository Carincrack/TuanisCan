-- ============================================================
-- RLS PARA PUBLIC.USUARIOS
-- ============================================================

alter table public.usuarios
enable row level security;


-- ============================================================
-- SELECT
-- ============================================================

-- Un usuario autenticado solamente puede consultar su perfil.
create policy "usuarios_select_own"
on public.usuarios
for select
to authenticated
using (
    (select auth.uid()) = id_usuario
);


-- El administrador puede consultar todos los usuarios.
create policy "admin_select_all_usuarios"
on public.usuarios
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

-- Un usuario puede actualizar únicamente su propia fila.
create policy "usuarios_update_own"
on public.usuarios
for update
to authenticated
using (
    (select auth.uid()) = id_usuario
)
with check (
    (select auth.uid()) = id_usuario
);


-- El administrador puede actualizar cualquier usuario.
create policy "admin_update_all_usuarios"
on public.usuarios
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
-- PROTEGER CAMPOS SENSIBLES
-- ============================================================

create or replace function public.protect_usuario_system_fields()
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

    -- El UUID nunca debe modificarse.
    if new.id_usuario is distinct from old.id_usuario then
        raise exception 'No se puede modificar id_usuario';
    end if;

    -- La fecha de creación tampoco debe modificarse.
    if new.fecha_registro is distinct from old.fecha_registro then
        raise exception 'No se puede modificar fecha_registro';
    end if;

    -- Admin es un rol interno de Supabase Auth,
    -- no un tipo de perfil público.
    if new.tipo_usuario = 'admin' then
        raise exception 'El tipo admin no puede asignarse a public.usuarios';
    end if;

    -- Un usuario normal no puede cambiar su rol ni su estado.
    if not is_admin then

        if new.tipo_usuario is distinct from old.tipo_usuario then
            raise exception 'No tiene permiso para modificar tipo_usuario';
        end if;

        if new.activo is distinct from old.activo then
            raise exception 'No tiene permiso para modificar activo';
        end if;

    end if;

    return new;
end;
$$;


create trigger protect_usuario_system_fields
before update on public.usuarios
for each row
execute function public.protect_usuario_system_fields();