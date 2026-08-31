update public.mascotas_perdidas
set raza = 'Desconocida'
where raza is null or trim(raza) = '';

update public.mascotas_perdidas
set contacto = 'Sin indicar'
where contacto is null or trim(contacto) = '';

alter table public.mascotas_perdidas
alter column raza set not null,
alter column contacto set not null;

alter table public.mascotas_perdidas
drop constraint if exists mascotas_perdidas_raza_not_blank,
add constraint mascotas_perdidas_raza_not_blank check (trim(raza) <> ''),
drop constraint if exists mascotas_perdidas_contacto_not_blank,
add constraint mascotas_perdidas_contacto_not_blank check (trim(contacto) <> '');

drop function if exists public.reportar_mascota_perdida(
    uuid,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text
);

drop function if exists public.reportar_mascota_perdida(
    uuid,
    text,
    text,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    text,
    numeric
);

create or replace function public.reportar_mascota_perdida(
    p_id_mascota uuid,
    p_especie text,
    p_nombre text,
    p_raza text,
    p_zona_id uuid,
    p_descripcion text,
    p_foto text,
    p_latitud numeric,
    p_longitud numeric,
    p_contacto text,
    p_recompensa numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid;
    v_reporte_id uuid;
    v_especie text;
    v_nombre text;
    v_raza text;
begin
    v_usuario_id := auth.uid();

    if v_usuario_id is null then
        raise exception 'Usuario no autenticado';
    end if;

    if not exists (select 1 from public.zonas where id_zona = p_zona_id) then
        raise exception 'La zona seleccionada no existe';
    end if;

    if p_id_mascota is not null then
        select m.especie, m.nombre, m.raza
        into v_especie, v_nombre, v_raza
        from public.mascotas m
        where m.id_mascota = p_id_mascota
          and m.id_dueno = v_usuario_id;

        if v_especie is null then
            raise exception 'La mascota no existe o no pertenece al usuario';
        end if;
    else
        v_especie := nullif(trim(p_especie), '');
        v_nombre := nullif(trim(p_nombre), '');
        v_raza := coalesce(nullif(trim(p_raza), ''), 'Desconocida');
    end if;

    if v_especie is null then
        raise exception 'La especie es obligatoria';
    end if;

    if v_nombre is null then
        raise exception 'El nombre es obligatorio';
    end if;

    if p_descripcion is null or trim(p_descripcion) = '' then
        raise exception 'La descripcion es obligatoria';
    end if;

    if p_contacto is null or trim(p_contacto) = '' then
        raise exception 'El contacto es obligatorio';
    end if;

    if p_foto is null or trim(p_foto) = '' then
        raise exception 'La foto es obligatoria';
    end if;

    if split_part(p_foto, '/', 1) <> v_usuario_id::text then
        raise exception 'La ruta de la foto no pertenece al usuario';
    end if;

    if p_latitud is null or p_latitud < -90 or p_latitud > 90 then
        raise exception 'Latitud invalida';
    end if;

    if p_longitud is null or p_longitud < -180 or p_longitud > 180 then
        raise exception 'Longitud invalida';
    end if;

    if p_recompensa is not null and p_recompensa < 0 then
        raise exception 'La recompensa no puede ser negativa';
    end if;

    insert into public.mascotas_perdidas (
        id_mascota,
        id_usuario_reporta,
        zona_id,
        especie,
        nombre,
        raza,
        contacto,
        descripcion,
        foto,
        latitud,
        longitud,
        recompensa
    )
    values (
        p_id_mascota,
        v_usuario_id,
        p_zona_id,
        v_especie,
        v_nombre,
        v_raza,
        trim(p_contacto),
        trim(p_descripcion),
        p_foto,
        p_latitud,
        p_longitud,
        p_recompensa
    )
    returning id_mascota_perdida into v_reporte_id;

    return v_reporte_id;
end;
$$;

revoke all
on function public.reportar_mascota_perdida(
    uuid,
    text,
    text,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    text,
    numeric
)
from public;

grant execute
on function public.reportar_mascota_perdida(
    uuid,
    text,
    text,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    text,
    numeric
)
to authenticated;
