-- Enfermedades y condiciones de salud de cada mascota. Se registran
-- aparte de las alergias para que cada una tenga sus cuidados, y
-- llegan al paseador en las solicitudes de paseo.

create table if not exists public.padecimientos_mascota (
    id_padecimiento uuid primary key default gen_random_uuid(),
    id_mascota uuid not null
        references public.mascotas(id_mascota)
        on delete cascade,
    nombre varchar(150) not null check (length(trim(nombre)) > 0),
    cuidados text check (cuidados is null or length(cuidados) <= 1000),
    fecha_diagnostico date,
    fecha_registro timestamptz not null default now()
);

create index if not exists padecimientos_mascota_id_mascota_idx
    on public.padecimientos_mascota (id_mascota);

alter table public.padecimientos_mascota enable row level security;

revoke all on public.padecimientos_mascota from public, anon;
grant select, insert, update, delete on public.padecimientos_mascota to authenticated;

-- Mismas reglas que historial_vacunas: solo el dueno de la mascota.
drop policy if exists "padecimientos_select_dueno" on public.padecimientos_mascota;
create policy "padecimientos_select_dueno"
on public.padecimientos_mascota for select to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1 from public.mascotas m
        where m.id_mascota = padecimientos_mascota.id_mascota
          and m.id_dueno = (select auth.uid())
    )
);

drop policy if exists "padecimientos_insert_dueno" on public.padecimientos_mascota;
create policy "padecimientos_insert_dueno"
on public.padecimientos_mascota for insert to authenticated
with check (
    public.usuario_actual_activo()
    and exists (
        select 1 from public.mascotas m
        where m.id_mascota = padecimientos_mascota.id_mascota
          and m.id_dueno = (select auth.uid())
    )
);

drop policy if exists "padecimientos_update_dueno" on public.padecimientos_mascota;
create policy "padecimientos_update_dueno"
on public.padecimientos_mascota for update to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1 from public.mascotas m
        where m.id_mascota = padecimientos_mascota.id_mascota
          and m.id_dueno = (select auth.uid())
    )
)
with check (
    public.usuario_actual_activo()
    and exists (
        select 1 from public.mascotas m
        where m.id_mascota = padecimientos_mascota.id_mascota
          and m.id_dueno = (select auth.uid())
    )
);

drop policy if exists "padecimientos_delete_dueno" on public.padecimientos_mascota;
create policy "padecimientos_delete_dueno"
on public.padecimientos_mascota for delete to authenticated
using (
    public.usuario_actual_activo()
    and exists (
        select 1 from public.mascotas m
        where m.id_mascota = padecimientos_mascota.id_mascota
          and m.id_dueno = (select auth.uid())
    )
);

drop trigger if exists exigir_usuario_verificado on public.padecimientos_mascota;
create trigger exigir_usuario_verificado
before insert or update or delete on public.padecimientos_mascota
for each row execute function public.exigir_usuario_verificado();

-- La solicitud que ve el paseador suma las enfermedades. Cambia el
-- tipo de retorno, por eso se elimina y se vuelve a crear.
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
    padecimientos jsonb,
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
        coalesce(nullif(trim(pu.nombre), ''), nullif(split_part(u.correo, '@', 1), ''), 'Dueno')::text,
        pu.foto_perfil,
        m.id_mascota,
        m.nombre::text,
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
        coalesce(padecimientos_agg.padecimientos, '[]'::jsonb),
        coalesce(z.nombre, 'Sin zona')::text,
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
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'nombre', d.nombre,
                'cuidados', d.cuidados,
                'fecha_diagnostico', d.fecha_diagnostico
            ) order by d.fecha_registro
        ) as padecimientos
        from public.padecimientos_mascota d
        where d.id_mascota = m.id_mascota
    ) padecimientos_agg on true
    where p.id_paseador = (select auth.uid())
      and p.estado = 'solicitado'
    order by p.fecha, p.hora_inicio;
$$;

revoke all on function public.listar_solicitudes_paseador() from public;
grant execute on function public.listar_solicitudes_paseador() to authenticated;
