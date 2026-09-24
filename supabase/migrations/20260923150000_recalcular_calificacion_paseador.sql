-- Bug: calificacion_promedio en paseadores nunca se recalculaba al
-- insertar/editar/borrar una reseña. "Reseñas recibidas" lee la tabla
-- resenas en vivo (por eso sí aparecía ahí), pero el perfil público
-- (buscar_paseadores) lee esta columna guardada, que quedaba congelada
-- en lo que fuera que tuviera al crear la cuenta.

-- protect_paseador_system_fields bloquea que cualquiera que no sea
-- admin toque calificacion_promedio. El trigger de recalculo necesita
-- una excepción explícita para esa única columna, activada solo
-- mientras corre su propio update.
create or replace function public.protect_paseador_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    is_admin boolean;
    recalculando boolean;
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

    recalculando := coalesce(current_setting('app.recalculando_calificacion', true), 'false') = 'true';

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

    -- La calificación no puede ser modificada directamente por el
    -- propio paseador, salvo por el trigger de recalculo automático.
    if not is_admin
       and not recalculando
       and new.calificacion_promedio
           is distinct from old.calificacion_promedio then
        raise exception
            'No tiene permiso para modificar calificacion_promedio';
    end if;

    return new;
end;
$$;

create or replace function public.recalcular_calificacion_paseador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_paseador_id uuid := coalesce(new.id_receptor, old.id_receptor);
begin
    if not exists (select 1 from public.paseadores where id_usuario = v_paseador_id) then
        return coalesce(new, old);
    end if;

    perform set_config('app.recalculando_calificacion', 'true', true);

    update public.paseadores
    set calificacion_promedio = coalesce(
        (select round(avg(calificacion)::numeric, 2) from public.resenas where id_receptor = v_paseador_id),
        0
    )
    where id_usuario = v_paseador_id;

    perform set_config('app.recalculando_calificacion', 'false', true);

    return coalesce(new, old);
end;
$$;

drop trigger if exists recalcular_calificacion_paseador on public.resenas;
create trigger recalcular_calificacion_paseador
after insert or update of calificacion or delete on public.resenas
for each row
execute function public.recalcular_calificacion_paseador();

-- Corrige de una vez las calificaciones ya congeladas de los
-- paseadores que ya tienen reseñas.
select set_config('app.recalculando_calificacion', 'true', true);

update public.paseadores p
set calificacion_promedio = coalesce(
    (select round(avg(r.calificacion)::numeric, 2) from public.resenas r where r.id_receptor = p.id_usuario),
    0
)
where exists (select 1 from public.resenas r where r.id_receptor = p.id_usuario);

select set_config('app.recalculando_calificacion', 'false', true);
