-- El directorio de negocios estaba vacio para cualquier usuario que no
-- fuera el dueno ni admin. La politica "negocios_select_authenticated"
-- decide si un negocio es publico mirando si su dueno esta activo y
-- aprobado con un EXISTS directo contra public.usuarios, pero esa tabla
-- tiene su propia RLS que solo deja ver la fila propia (o todas, si es
-- admin). Esa subconsulta anidada quedaba bloqueada por la RLS de
-- usuarios antes de poder evaluar la condicion, asi que el EXISTS
-- siempre salia falso para cualquier negocio ajeno.
--
-- La funcion es security definer: igual que es_admin_actual() o
-- usuario_actual_activo(), se salta la RLS de usuarios a propósito,
-- porque lo unico que expone es un booleano ("esta aprobado y activo"),
-- no datos privados de la cuenta.

create or replace function public.usuario_aprobado_y_activo(p_id_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.usuarios u
        where u.id_usuario = p_id_usuario
          and u.activo = true
          and u.estado_verificacion = 'aprobado'
    );
$$;

revoke all on function public.usuario_aprobado_y_activo(uuid) from public;
grant execute on function public.usuario_aprobado_y_activo(uuid) to authenticated;

drop policy if exists "negocios_select_authenticated" on public.negocios;
create policy "negocios_select_authenticated"
on public.negocios
for select to authenticated
using (
    id_usuario = (select auth.uid())
    or public.es_admin_actual()
    or public.usuario_aprobado_y_activo(id_usuario)
);
