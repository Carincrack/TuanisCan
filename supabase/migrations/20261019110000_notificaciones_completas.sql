-- =====================================================================
-- Notificaciones que faltaban
--
-- El flujo del paseo ya avisaba en cada paso (solicitud, respuesta,
-- pago, inicio, fin). Quedaban cuatro momentos importantes en silencio:
--
--   1. El admin aprueba o rechaza la verificación de una cuenta: la
--      persona no se enteraba hasta volver a entrar a su perfil. El tipo
--      'verificacion' existía en el enum y nadie lo usaba.
--   2. Alguien manda su verificación: el admin no se enteraba.
--   3. Alguien deja una reseña: quien la recibe no se enteraba.
--   4. El dueño marca su mascota perdida como encontrada: quienes
--      reportaron haberla visto no se enteraban.
--
-- Van como disparadores sobre la tabla que cambia y no dentro de las
-- funciones que la cambian: así avisan sea cual sea el camino —la
-- función de hoy, una futura o un cambio hecho a mano por el equipo—
-- y no hay que reescribir funciones grandes que ya andan.
--
-- Todo lo que se inserta en `notificaciones` llega al instante: la
-- tabla ya está en `supabase_realtime`.
--
-- Se puede pegar entera en el SQL Editor y volver a correr sin daño.
-- =====================================================================


-- ── 1 y 2. Verificación de la cuenta ───────────────────────────────

create or replace function public.avisar_cambio_verificacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre text;
begin
    if new.estado_verificacion is not distinct from old.estado_verificacion then
        return new;
    end if;

    if new.estado_verificacion::text = 'aprobado' then
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            new.id_usuario,
            'verificacion',
            'Tu cuenta fue verificada. Ya puedes usar todo TuanisCan.',
            new.id_usuario
        );

    elsif new.estado_verificacion::text = 'rechazado' then
        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        values (
            new.id_usuario,
            'verificacion',
            'Tu verificación fue rechazada'
                || coalesce(': ' || nullif(trim(new.observacion_verificacion), ''), '')
                || '. Revisa tus documentos y vuelve a enviarla.',
            new.id_usuario
        );

    elsif new.estado_verificacion::text = 'pendiente' then
        -- Una solicitud nueva: a cada cuenta admin le llega un aviso.
        -- Los admin se marcan en `app_metadata.app_role`, que es lo que
        -- también mira `es_admin_actual()`.
        select coalesce(nullif(trim(pu.nombre), ''), 'una cuenta')
        into v_nombre
        from public.perfil_usuario pu
        where pu.id_usuario = new.id_usuario;

        insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
        select
            au.id,
            'verificacion',
            'Nueva solicitud de verificación de ' || coalesce(v_nombre, 'una cuenta') || '.',
            new.id_usuario
        from auth.users au
        where au.raw_app_meta_data ->> 'app_role' = 'admin'
          and au.id <> new.id_usuario;
    end if;

    return new;
end;
$$;

revoke all on function public.avisar_cambio_verificacion() from public, anon, authenticated;

drop trigger if exists avisar_cambio_verificacion on public.usuarios;

create trigger avisar_cambio_verificacion
    after update of estado_verificacion on public.usuarios
    for each row execute function public.avisar_cambio_verificacion();


-- ── 3. Reseña recibida ─────────────────────────────────────────────

create or replace function public.avisar_resena_recibida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_autor text;
    v_mascota text;
begin
    if new.id_receptor is null or new.id_receptor = new.id_autor then
        return new;
    end if;

    select coalesce(nullif(trim(pu.nombre), ''), 'Alguien')
    into v_autor
    from public.perfil_usuario pu
    where pu.id_usuario = new.id_autor;

    select m.nombre
    into v_mascota
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    where p.id_paseo = new.id_paseo;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    values (
        new.id_receptor,
        'resena',
        coalesce(v_autor, 'Alguien') || ' te dejó una reseña de ' || new.calificacion || ' ★'
            || coalesce(' por el paseo de ' || v_mascota, '') || '.',
        new.id_paseo
    );

    return new;
end;
$$;

revoke all on function public.avisar_resena_recibida() from public, anon, authenticated;

drop trigger if exists avisar_resena_recibida on public.resenas;

create trigger avisar_resena_recibida
    after insert on public.resenas
    for each row execute function public.avisar_resena_recibida();


-- ── 4. Mascota perdida encontrada ──────────────────────────────────
-- Un aviso por persona, aunque haya reportado varios avistamientos, y
-- nunca a quien hizo el reporte: él fue quien la marcó.

create or replace function public.avisar_mascota_encontrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre text;
begin
    if new.estado::text <> 'encontrada' or old.estado is not distinct from new.estado then
        return new;
    end if;

    select coalesce(nullif(trim(new.nombre), ''), m.nombre, 'La mascota')
    into v_nombre
    from (select 1) uno
    left join public.mascotas m on m.id_mascota = new.id_mascota;

    insert into public.notificaciones (id_usuario, tipo, mensaje, referencia_id)
    select distinct
        a.id_usuario,
        'mascota_perdida'::public.tipo_notificacion,
        v_nombre || ' ya apareció. Gracias por avisar que la viste.',
        new.id_mascota_perdida
    from public.avistamientos a
    where a.id_reporte = new.id_mascota_perdida
      and a.id_usuario is not null
      and a.id_usuario <> new.id_usuario_reporta;

    return new;
end;
$$;

revoke all on function public.avisar_mascota_encontrada() from public, anon, authenticated;

drop trigger if exists avisar_mascota_encontrada on public.mascotas_perdidas;

create trigger avisar_mascota_encontrada
    after update of estado on public.mascotas_perdidas
    for each row execute function public.avisar_mascota_encontrada();
