-- El paseador ve la ficha completa de la mascota (incluida la foto y
-- las vacunas) en las solicitudes que recibe.

-- El bucket 'mascotas' solo dejaba leer al dueno. El paseador puede leer
-- la foto de una mascota mientras tenga un paseo activo con ella.
create or replace function public.paseador_puede_ver_foto_mascota(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.paseos p
        inner join public.mascotas m on m.id_mascota = p.id_mascota
        where m.foto = p_ruta
          and p.id_paseador = auth.uid()
          and p.estado in ('solicitado', 'confirmado', 'en_curso')
    );
$$;

revoke all on function public.paseador_puede_ver_foto_mascota(text) from public;
grant execute on function public.paseador_puede_ver_foto_mascota(text) to authenticated;

drop policy if exists "paseadores_select_pet_photos" on storage.objects;
create policy "paseadores_select_pet_photos"
on storage.objects for select to authenticated
using (
    bucket_id = 'mascotas'
    and public.usuario_actual_activo()
    and public.paseador_puede_ver_foto_mascota(name)
);

-- Cambia el tipo de retorno, por eso se elimina y se vuelve a crear.
drop function if exists public.listar_solicitudes_paseador();

create function public.listar_solicitudes_paseador()
returns table (
    id_paseo uuid,
    id_dueno uuid,
    dueno text,
    dueno_foto text,
    id_mascota uuid,
    mascota text,
    raza text,
    especie text,
    foto text,
    sexo text,
    fecha_nacimiento date,
    peso numeric,
    color text,
    esterilizado boolean,
    microchip text,
    alergias text,
    veterinaria text,
    notas text,
    vacunas jsonb,
    zona text,
    fecha date,
    hora_inicio time,
    duracion_min integer,
    direccion_encuentro text,
    precio numeric,
    estado public.estado_paseo,
    comentario_respuesta text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id_paseo,
        p.id_dueno,
        coalesce(nullif(trim(pu.nombre), ''), nullif(split_part(u.correo, '@', 1), ''), 'Dueno')::text as dueno,
        pu.foto_perfil as dueno_foto,
        m.id_mascota,
        m.nombre::text as mascota,
        m.raza::text,
        m.especie::text,
        m.foto,
        m.sexo::text,
        m.fecha_nacimiento,
        m.peso,
        m.color::text,
        m.esterilizado,
        m.microchip::text,
        m.alergias,
        m.veterinaria::text,
        m.notas,
        coalesce(vacunas_agg.vacunas, '[]'::jsonb),
        coalesce(z.nombre, 'Sin zona')::text as zona,
        p.fecha,
        p.hora_inicio,
        p.duracion_min,
        p.direccion_encuentro,
        p.precio,
        p.estado,
        p.comentario_respuesta
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    inner join public.usuarios u on u.id_usuario = p.id_dueno
    left join public.perfil_usuario pu on pu.id_usuario = p.id_dueno
    left join public.zonas z on z.id_zona = p.zona_id
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'nombre_vacuna', v.nombre_vacuna,
                'fecha_aplicacion', v.fecha_aplicacion,
                'fecha_vencimiento', v.fecha_vencimiento
            ) order by v.fecha_aplicacion desc
        ) as vacunas
        from public.historial_vacunas v
        where v.id_mascota = m.id_mascota
    ) vacunas_agg on true
    where p.id_paseador = auth.uid()
      and p.estado = 'solicitado'
    order by p.fecha, p.hora_inicio;
$$;

revoke all on function public.listar_solicitudes_paseador() from public;
grant execute on function public.listar_solicitudes_paseador() to authenticated;
