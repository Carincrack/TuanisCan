-- =====================================================================
-- Chat entre el dueño y el paseador, atado al paseo
--
-- Las reglas, en el orden en que pasan:
--
--   paseo confirmado  -> todavía no hay chat
--   paseo en curso    -> el chat se abre: los dos pueden escribir
--   paseo terminado   -> el chat queda BLOQUEADO: se lee, no se escribe
--   7 días después    -> el chat se borra solo
--
-- Los 7 días cuentan desde que se abrió el chat (cuando el paseo
-- empezó). Pasado ese plazo el chat deja de aparecer al instante, y
-- los mensajes se borran de verdad una vez por día (pg_cron, 3 a. m.
-- de Costa Rica). Si pg_cron no se pudiera activar, igual nadie ve un
-- chat vencido: todas las consultas lo filtran.
--
-- La tabla `mensajes` ya existía, vacía y sin usarse. Se le agrega el
-- tipo (texto o sticker de TuanisCan) y se cierra la escritura directa
-- desde el navegador: se escribe solo con `enviar_mensaje`, que es la
-- que controla que el paseo esté en curso. Antes cualquiera de los dos
-- podía escribir en cualquier momento y el que recibía un mensaje podía
-- cambiarle el texto.
--
-- «Está escribiendo…» y «en línea» no tocan la base: viajan por el
-- canal en tiempo real (broadcast y presence de Supabase).
--
-- Se puede pegar entera en el SQL Editor y volver a correr sin daño.
-- =====================================================================


-- ── 1. Cuándo se abre y se cierra el chat de cada paseo ────────────

alter table public.paseos
    add column if not exists chat_abierto_en timestamptz,
    add column if not exists chat_cerrado_en timestamptz;

comment on column public.paseos.chat_abierto_en is
    'Cuándo empezó el paseo y se abrió el chat. El chat se borra 7 días después.';
comment on column public.paseos.chat_cerrado_en is
    'Cuándo el paseo terminó (o se canceló en curso) y el chat quedó solo para leer.';

create or replace function public.marcar_chat_del_paseo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.estado is distinct from old.estado then
        if new.estado::text = 'en_curso' then
            new.chat_abierto_en := coalesce(new.chat_abierto_en, now());
        elsif new.estado::text in ('finalizado', 'cancelado') and new.chat_abierto_en is not null then
            new.chat_cerrado_en := coalesce(new.chat_cerrado_en, now());
        end if;
    end if;
    return new;
end;
$$;

revoke all on function public.marcar_chat_del_paseo() from public, anon, authenticated;

drop trigger if exists marcar_chat_del_paseo on public.paseos;

create trigger marcar_chat_del_paseo
    before update of estado on public.paseos
    for each row execute function public.marcar_chat_del_paseo();


-- ── 2. Los mensajes: tipo y escritura solo por la función ──────────

alter table public.mensajes
    add column if not exists tipo text not null default 'texto';

alter table public.mensajes drop constraint if exists mensajes_tipo_check;
alter table public.mensajes drop constraint if exists mensajes_contenido_largo;

alter table public.mensajes
    add constraint mensajes_tipo_check check (tipo in ('texto', 'sticker')),
    add constraint mensajes_contenido_largo check (char_length(contenido) between 1 and 1000);

create index if not exists mensajes_paseo_fecha_idx
    on public.mensajes (id_paseo, fecha_envio);

drop policy if exists "Los participantes pueden enviar mensajes" on public.mensajes;
drop policy if exists "El destinatario puede marcar mensajes como leidos" on public.mensajes;

revoke insert, update, delete on table public.mensajes from anon, authenticated;
grant select on table public.mensajes to authenticated;

-- Leer sigue siendo por RLS (lo usa también el tiempo real): cada uno
-- ve los mensajes que mandó o que le mandaron.


-- ── 3. Mis chats ───────────────────────────────────────────────────
-- Los chats vigentes de la cuenta, el más reciente primero, con el
-- último mensaje y cuántos faltan por leer. Una cuenta que es dueño y
-- paseador a la vez ve los chats de los dos lados.

create or replace function public.listar_mis_chats()
returns table (
    id_paseo uuid,
    mascota text,
    foto_mascota text,
    otra_persona text,
    foto_otra_persona text,
    soy text,
    estado_paseo public.estado_paseo,
    abierto boolean,
    vence_en timestamptz,
    ultimo_contenido text,
    ultimo_tipo text,
    ultimo_es_mio boolean,
    ultimo_en timestamptz,
    sin_leer integer
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id_paseo,
        m.nombre::text,
        m.foto,
        coalesce(
            nullif(trim(pu.nombre), ''),
            case when p.id_dueno = (select auth.uid()) then 'Paseador' else 'Dueño' end
        )::text,
        pu.foto_perfil,
        case when p.id_dueno = (select auth.uid()) then 'dueno' else 'paseador' end,
        p.estado,
        p.estado::text = 'en_curso',
        p.chat_abierto_en + interval '7 days',
        u.contenido,
        u.tipo,
        u.id_remitente = (select auth.uid()),
        u.fecha_envio,
        (
            select count(*)::integer
            from public.mensajes x
            where x.id_paseo = p.id_paseo
              and x.id_destinatario = (select auth.uid())
              and not x.leido
        )
    from public.paseos p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu
        on pu.id_usuario = case when p.id_dueno = (select auth.uid()) then p.id_paseador else p.id_dueno end
    left join lateral (
        select x.contenido, x.tipo, x.id_remitente, x.fecha_envio
        from public.mensajes x
        where x.id_paseo = p.id_paseo
        order by x.fecha_envio desc
        limit 1
    ) u on true
    where (p.id_dueno = (select auth.uid()) or p.id_paseador = (select auth.uid()))
      and p.chat_abierto_en is not null
      and p.chat_abierto_en > now() - interval '7 days'
    order by coalesce(u.fecha_envio, p.chat_abierto_en) desc;
$$;

revoke all on function public.listar_mis_chats() from public, anon;
grant execute on function public.listar_mis_chats() to authenticated;


-- ── 4. Los mensajes de un chat ─────────────────────────────────────

create or replace function public.listar_mensajes(p_id_paseo uuid)
returns table (
    id_mensaje uuid,
    es_mio boolean,
    tipo text,
    contenido text,
    leido boolean,
    fecha_envio timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select x.id_mensaje, x.id_remitente = (select auth.uid()), x.tipo, x.contenido, x.leido, x.fecha_envio
    from public.mensajes x
    inner join public.paseos p on p.id_paseo = x.id_paseo
    where x.id_paseo = p_id_paseo
      and (p.id_dueno = (select auth.uid()) or p.id_paseador = (select auth.uid()))
      and p.chat_abierto_en > now() - interval '7 days'
    order by x.fecha_envio;
$$;

revoke all on function public.listar_mensajes(uuid) from public, anon;
grant execute on function public.listar_mensajes(uuid) to authenticated;


-- ── 5. Enviar: solo con el paseo en curso ──────────────────────────
-- Los stickers son de una lista fija: el código que llega tiene que ser
-- uno de los de TuanisCan. Devuelve el mensaje tal como quedó, para
-- que quien lo manda lo pinte sin esperar al tiempo real.

create or replace function public.enviar_mensaje(
    p_id_paseo uuid,
    p_contenido text,
    p_tipo text default 'texto'
)
returns table (
    id_mensaje uuid,
    es_mio boolean,
    tipo text,
    contenido text,
    leido boolean,
    fecha_envio timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario uuid := auth.uid();
    v_dueno uuid;
    v_paseador uuid;
    v_estado text;
    v_destinatario uuid;
    v_contenido text;
begin
    if v_usuario is null then
        raise exception 'Usuario no autenticado';
    end if;

    select p.id_dueno, p.id_paseador, p.estado::text
    into v_dueno, v_paseador, v_estado
    from public.paseos p
    where p.id_paseo = p_id_paseo;

    if not found or v_usuario not in (v_dueno, v_paseador) then
        raise exception 'Este chat no es tuyo';
    end if;

    if v_estado <> 'en_curso' then
        raise exception 'El chat está cerrado: solo se puede escribir mientras el paseo está en curso.';
    end if;

    if p_tipo = 'sticker' then
        if p_contenido not in ('ya-llegue', 'salimos', 'hizo-popo', 'tomo-agua', 'feliz', 'jugando', 'de-regreso', 'pura-vida') then
            raise exception 'Ese sticker no existe';
        end if;
        v_contenido := p_contenido;
    elsif p_tipo = 'texto' then
        v_contenido := trim(p_contenido);
        if v_contenido is null or v_contenido = '' then
            raise exception 'El mensaje está vacío';
        end if;
        if char_length(v_contenido) > 1000 then
            raise exception 'El mensaje es muy largo: máximo 1000 caracteres';
        end if;
    else
        raise exception 'Tipo de mensaje no válido';
    end if;

    -- A quién va: al otro. Una cuenta dueño y paseador del mismo paseo
    -- (pruebas) se escribe a sí misma.
    v_destinatario := case when v_usuario = v_dueno then v_paseador else v_dueno end;

    return query
    insert into public.mensajes (id_paseo, id_remitente, id_destinatario, contenido, tipo)
    values (p_id_paseo, v_usuario, v_destinatario, v_contenido, p_tipo)
    returning mensajes.id_mensaje, true, mensajes.tipo, mensajes.contenido, mensajes.leido, mensajes.fecha_envio;
end;
$$;

revoke all on function public.enviar_mensaje(uuid, text, text) from public, anon;
grant execute on function public.enviar_mensaje(uuid, text, text) to authenticated;


-- ── 6. Leídos ──────────────────────────────────────────────────────

create or replace function public.marcar_chat_leido(p_id_paseo uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cuantos integer;
begin
    update public.mensajes
    set leido = true
    where id_paseo = p_id_paseo
      and id_destinatario = auth.uid()
      and not leido;
    get diagnostics v_cuantos = row_count;
    return v_cuantos;
end;
$$;

revoke all on function public.marcar_chat_leido(uuid) from public, anon;
grant execute on function public.marcar_chat_leido(uuid) to authenticated;

-- El número del menú: mensajes sin leer en chats vigentes.
create or replace function public.contar_mensajes_sin_leer()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.mensajes x
    inner join public.paseos p on p.id_paseo = x.id_paseo
    where x.id_destinatario = (select auth.uid())
      and not x.leido
      and p.chat_abierto_en > now() - interval '7 days';
$$;

revoke all on function public.contar_mensajes_sin_leer() from public, anon;
grant execute on function public.contar_mensajes_sin_leer() to authenticated;


-- ── 7. Borrar los chats vencidos ───────────────────────────────────

create or replace function public.borrar_chats_vencidos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cuantos integer;
begin
    delete from public.mensajes x
    using public.paseos p
    where p.id_paseo = x.id_paseo
      and p.chat_abierto_en <= now() - interval '7 days';
    get diagnostics v_cuantos = row_count;
    return v_cuantos;
end;
$$;

revoke all on function public.borrar_chats_vencidos() from public, anon, authenticated;

-- Una vez por día, a las 3 a. m. de Costa Rica (9:00 UTC). Si pg_cron
-- no se puede activar en este proyecto, la migración sigue: los chats
-- vencidos igual no se ven, solo quedan guardados hasta limpiarlos.
do $$
begin
    create extension if not exists pg_cron with schema pg_catalog;
exception when others then
    raise notice 'pg_cron no disponible: %', sqlerrm;
end
$$;

do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'borrar-chats-vencidos';
        perform cron.schedule('borrar-chats-vencidos', '0 9 * * *', 'select public.borrar_chats_vencidos()');
    end if;
end
$$;


-- ── 8. Tiempo real ─────────────────────────────────────────────────

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes'
    ) then
        alter publication supabase_realtime add table public.mensajes;
    end if;
end
$$;


-- ── 9. Que la API vea las funciones nuevas sin esperar ─────────────
notify pgrst, 'reload schema';
