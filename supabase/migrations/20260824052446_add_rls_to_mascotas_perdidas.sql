-- ============================================================
-- RLS: MASCOTAS PERDIDAS
-- ============================================================

alter table public.mascotas_perdidas
enable row level security;


-- ============================================================
-- SELECT
-- Los usuarios autenticados pueden consultar los reportes.
-- Esto permite construir el feed/mapa de mascotas perdidas.
-- ============================================================

create policy "mascotas_perdidas_select_authenticated"
on public.mascotas_perdidas
for select
to authenticated
using (true);


-- ============================================================
-- INSERT
-- Cada usuario solamente puede crear reportes a su nombre.
-- ============================================================

create policy "mascotas_perdidas_insert_own"
on public.mascotas_perdidas
for insert
to authenticated
with check (
    id_usuario_reporta = (select auth.uid())
);


-- ============================================================
-- UPDATE DEL PROPIETARIO DEL REPORTE
-- ============================================================

create policy "mascotas_perdidas_update_own"
on public.mascotas_perdidas
for update
to authenticated
using (
    id_usuario_reporta = (select auth.uid())
)
with check (
    id_usuario_reporta = (select auth.uid())
);


-- ============================================================
-- UPDATE ADMIN
-- ============================================================

create policy "admin_update_all_mascotas_perdidas"
on public.mascotas_perdidas
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
-- PROTECCIÓN DE CAMPOS DEL SISTEMA
-- ============================================================

create or replace function public.protect_mascota_perdida_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    -- El ID del reporte nunca puede cambiar.
    if new.id_reporte is distinct from old.id_reporte then
        raise exception 'No se puede modificar id_reporte';
    end if;


    -- No se puede cambiar quién creó el reporte.
    if new.id_usuario_reporta
       is distinct from old.id_usuario_reporta then

        raise exception
            'No se puede modificar id_usuario_reporta';

    end if;


    -- La fecha original del reporte no puede modificarse.
    if new.fecha_reporte
       is distinct from old.fecha_reporte then

        raise exception
            'No se puede modificar fecha_reporte';

    end if;


    -- Si la mascota pasa a encontrada,
    -- registramos automáticamente cuándo se resolvió.
    if old.estado = 'perdida'
       and new.estado = 'encontrada'
       and new.fecha_resuelto is null then

        new.fecha_resuelto := now();

    end if;


    -- Mientras continúe perdida,
    -- no debería existir fecha de resolución.
    if new.estado = 'perdida' then
        new.fecha_resuelto := null;
    end if;


    return new;

end;
$$;


create trigger protect_mascota_perdida_system_fields
before update on public.mascotas_perdidas
for each row
execute function public.protect_mascota_perdida_system_fields();