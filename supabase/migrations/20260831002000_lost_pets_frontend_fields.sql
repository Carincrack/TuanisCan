alter table public.mascotas_perdidas
add column if not exists nombre varchar(100),
add column if not exists raza varchar(100),
add column if not exists contacto varchar(50);

update public.mascotas_perdidas mp
set
    nombre = coalesce(nullif(trim(mp.nombre), ''), m.nombre, 'Mascota perdida'),
    raza = coalesce(nullif(trim(mp.raza), ''), m.raza),
    contacto = nullif(trim(mp.contacto), '')
from public.mascotas m
where mp.id_mascota = m.id_mascota;

update public.mascotas_perdidas
set nombre = 'Mascota perdida'
where nombre is null or trim(nombre) = '';

alter table public.mascotas_perdidas
alter column nombre set not null;

alter table public.mascotas_perdidas
drop constraint if exists mascotas_perdidas_nombre_not_blank,
add constraint mascotas_perdidas_nombre_not_blank check (trim(nombre) <> '');

insert into storage.buckets (id, name, public)
values ('mascotas-perdidas', 'mascotas-perdidas', false)
on conflict (id) do nothing;

drop function if exists public.reportar_mascota_perdida(
    uuid,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric
);

create or replace function public.reportar_mascota_perdida(
    p_id_mascota uuid,
    p_especie text,
    p_zona_id uuid,
    p_descripcion text,
    p_foto text,
    p_latitud numeric,
    p_longitud numeric,
    p_recompensa numeric default null,
    p_nombre text default null,
    p_raza text default null,
    p_contacto text default null
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
        if p_especie is null or trim(p_especie) = '' then
            raise exception 'La especie es obligatoria';
        end if;

        if p_nombre is null or trim(p_nombre) = '' then
            raise exception 'El nombre de la mascota es obligatorio';
        end if;

        v_especie := trim(p_especie);
        v_nombre := trim(p_nombre);
        v_raza := nullif(trim(p_raza), '');
    end if;

    if p_descripcion is null or trim(p_descripcion) = '' then
        raise exception 'La descripcion es obligatoria';
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
        nullif(trim(p_contacto), ''),
        trim(p_descripcion),
        p_foto,
        p_latitud,
        p_longitud,
        p_recompensa
    )
    returning id_reporte into v_reporte_id;

    return v_reporte_id;
end;
$$;

revoke all
on function public.reportar_mascota_perdida(
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
)
from public;

grant execute
on function public.reportar_mascota_perdida(
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
)
to authenticated;
