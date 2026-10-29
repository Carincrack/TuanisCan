-- =====================================================================
-- Chat: fotos del paseo y borrar el chat de cada lado
--
-- 1. FOTOS. El paseador (o el dueño) puede mandar fotos mientras el
--    paseo está en curso: es la evidencia del paseo. Van a un bucket
--    privado, `chat-fotos`, en una carpeta por paseo
--    («<id_paseo>/<archivo>.jpg»). Solo los dos del paseo las ven, y
--    solo mientras el chat exista.
--
-- 2. BORRAR DE MI LADO. Cada uno puede borrar el chat: deja de verlo
--    él, el otro lo sigue viendo. Si después llega un mensaje nuevo
--    (el paseo seguía en curso), el chat vuelve a aparecer solo con lo
--    nuevo, como en cualquier app de mensajes.
--
-- 3. BORRADO TOTAL. Cuando los DOS lo borraron, o pasaron los 7 días,
--    el chat se borra de verdad: mensajes y fotos. Las fotos no se
--    pueden borrar desde SQL (Supabase lo impide para no dejar
--    archivos huérfanos): las borra la función `limpiar-chats` por la
--    API de Storage. La llama la app apenas el segundo borra el chat, y
--    pg_cron una vez por día para lo vencido.
--
-- Se puede pegar entera en el SQL Editor y volver a correr sin daño.
-- La función `limpiar-chats` está en supabase/functions/limpiar-chats.
-- =====================================================================


-- ── 1. El bucket de fotos ──────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-fotos', 'chat-fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Subir: solo a la carpeta de un paseo propio que esté en curso.
drop policy if exists "chat_fotos_subir" on storage.objects;
create policy "chat_fotos_subir"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'chat-fotos'
        and exists (
            select 1 from public.paseos p
            where p.id_paseo::text = (storage.foldername(name))[1]
              and (select auth.uid()) in (p.id_dueno, p.id_paseador)
              and p.estado::text = 'en_curso'
        )
    );

-- Ver: los dos del paseo, mientras el chat no haya vencido.
drop policy if exists "chat_fotos_ver" on storage.objects;
create policy "chat_fotos_ver"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'chat-fotos'
        and exists (
            select 1 from public.paseos p
            where p.id_paseo::text = (storage.foldername(name))[1]
              and (select auth.uid()) in (p.id_dueno, p.id_paseador)
              and p.chat_abierto_en > now() - interval '7 days'
        )
    );


-- ── 2. Las fotos como mensaje ──────────────────────────────────────

alter table public.mensajes drop constraint if exists mensajes_tipo_check;
alter table public.mensajes
    add constraint mensajes_tipo_check check (tipo in ('texto', 'sticker', 'foto'));


-- ── 3. Quién borró el chat y cuándo ────────────────────────────────

alter table public.paseos
    add column if not exists chat_borrado_dueno_en timestamptz,
    add column if not exists chat_borrado_paseador_en timestamptz;

comment on column public.paseos.chat_borrado_dueno_en is
    'Cuándo el dueño borró el chat de su lado. Ve solo lo que llegue después.';
comment on column public.paseos.chat_borrado_paseador_en is
    'Cuándo el paseador borró el chat de su lado. Ve solo lo que llegue después.';


-- ── 4. Enviar: texto, sticker o foto ───────────────────────────────

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
    elsif p_tipo = 'foto' then
        -- La ruta de una foto ya subida por quien la manda, en la
        -- carpeta de este paseo.
        v_contenido := p_contenido;
        if v_contenido !~ ('^' || p_id_paseo::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$') then
            raise exception 'La foto no es válida';
        end if;
        if not exists (
            select 1 from storage.objects o
            where o.bucket_id = 'chat-fotos'
              and o.name = v_contenido
              and o.owner_id = v_usuario::text
        ) then
            raise exception 'La foto no se terminó de subir. Intenta de nuevo.';
        end if;
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

    v_destinatario := case when v_usuario = v_dueno then v_paseador else v_dueno end;

    return query
    insert into public.mensajes (id_paseo, id_remitente, id_destinatario, contenido, tipo)
    values (p_id_paseo, v_usuario, v_destinatario, v_contenido, p_tipo)
    returning mensajes.id_mensaje, true, mensajes.tipo, mensajes.contenido, mensajes.leido, mensajes.fecha_envio;
end;
$$;

revoke all on function public.enviar_mensaje(uuid, text, text) from public, anon;
grant execute on function public.enviar_mensaje(uuid, text, text) to authenticated;


-- ── 5. Leer: cada uno ve lo que llegó después de su borrado ────────

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
    with mios as (
        select
            p.*,
            case when p.id_dueno = (select auth.uid()) then p.chat_borrado_dueno_en else p.chat_borrado_paseador_en end as mi_borrado
        from public.paseos p
        where (select auth.uid()) in (p.id_dueno, p.id_paseador)
          and p.chat_abierto_en is not null
          and p.chat_abierto_en > now() - interval '7 days'
    )
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
              and x.fecha_envio > coalesce(p.mi_borrado, '-infinity'::timestamptz)
        )
    from mios p
    inner join public.mascotas m on m.id_mascota = p.id_mascota
    left join public.perfil_usuario pu
        on pu.id_usuario = case when p.id_dueno = (select auth.uid()) then p.id_paseador else p.id_dueno end
    left join lateral (
        select x.contenido, x.tipo, x.id_remitente, x.fecha_envio
        from public.mensajes x
        where x.id_paseo = p.id_paseo
          and x.fecha_envio > coalesce(p.mi_borrado, '-infinity'::timestamptz)
        order by x.fecha_envio desc
        limit 1
    ) u on true
    -- Borrado de mi lado: no aparece, salvo que haya llegado algo después.
    where p.mi_borrado is null or u.fecha_envio is not null
    order by coalesce(u.fecha_envio, p.chat_abierto_en) desc;
$$;

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
      and (select auth.uid()) in (p.id_dueno, p.id_paseador)
      and p.chat_abierto_en > now() - interval '7 days'
      and x.fecha_envio > coalesce(
          case when p.id_dueno = (select auth.uid()) then p.chat_borrado_dueno_en else p.chat_borrado_paseador_en end,
          '-infinity'::timestamptz
      )
    order by x.fecha_envio;
$$;

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
      and p.chat_abierto_en > now() - interval '7 days'
      and x.fecha_envio > coalesce(
          case when p.id_dueno = (select auth.uid()) then p.chat_borrado_dueno_en else p.chat_borrado_paseador_en end,
          '-infinity'::timestamptz
      );
$$;


-- ── 6. Borrar el chat de mi lado ───────────────────────────────────
-- Devuelve true cuando, con este, ya lo borraron los dos: la app
-- entonces le pide a `limpiar-chats` el borrado total.

create or replace function public.borrar_mi_chat(p_id_paseo uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario uuid := auth.uid();
    v_dueno_borro timestamptz;
    v_paseador_borro timestamptz;
begin
    if v_usuario is null then
        raise exception 'Usuario no autenticado';
    end if;

    update public.paseos p
    set chat_borrado_dueno_en = case when p.id_dueno = v_usuario then now() else p.chat_borrado_dueno_en end,
        chat_borrado_paseador_en = case when p.id_paseador = v_usuario then now() else p.chat_borrado_paseador_en end
    where p.id_paseo = p_id_paseo
      and v_usuario in (p.id_dueno, p.id_paseador)
    returning p.chat_borrado_dueno_en, p.chat_borrado_paseador_en
    into v_dueno_borro, v_paseador_borro;

    if not found then
        raise exception 'Este chat no es tuyo';
    end if;

    return v_dueno_borro is not null and v_paseador_borro is not null;
end;
$$;

revoke all on function public.borrar_mi_chat(uuid) from public, anon;
grant execute on function public.borrar_mi_chat(uuid) to authenticated;


-- ── 7. El borrado total (solo para `limpiar-chats`) ────────────────
-- Qué hay que borrar y hasta cuándo: todo, si el chat venció; si lo
-- borraron los dos, lo que llegó hasta el último de los dos borrados.
-- Con las rutas de las fotos, que la función borra por Storage.

create or replace function public.chats_por_purgar(
    p_id_paseo uuid default null,
    p_usuario uuid default null
)
returns table (id_paseo uuid, hasta timestamptz, rutas text[])
language sql
stable
security definer
set search_path = ''
as $$
    with candidatos as (
        select
            p.id_paseo,
            case
                when p.chat_abierto_en <= now() - interval '7 days' then now()
                else greatest(p.chat_borrado_dueno_en, p.chat_borrado_paseador_en)
            end as hasta
        from public.paseos p
        where p.chat_abierto_en is not null
          and (
              p.chat_abierto_en <= now() - interval '7 days'
              or (p.chat_borrado_dueno_en is not null and p.chat_borrado_paseador_en is not null)
          )
          and (p_id_paseo is null or p.id_paseo = p_id_paseo)
          and (p_usuario is null or p_usuario in (p.id_dueno, p.id_paseador))
    )
    select
        c.id_paseo,
        c.hasta,
        coalesce(array_agg(x.contenido) filter (where x.tipo = 'foto'), '{}')
    from candidatos c
    inner join public.mensajes x on x.id_paseo = c.id_paseo and x.fecha_envio <= c.hasta
    group by c.id_paseo, c.hasta;
$$;

create or replace function public.purgar_chat(p_id_paseo uuid, p_hasta timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cuantos integer;
begin
    delete from public.mensajes x
    where x.id_paseo = p_id_paseo
      and x.fecha_envio <= p_hasta;
    get diagnostics v_cuantos = row_count;
    return v_cuantos;
end;
$$;

revoke all on function public.chats_por_purgar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purgar_chat(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.chats_por_purgar(uuid, uuid) to service_role;
grant execute on function public.purgar_chat(uuid, timestamptz) to service_role;


-- ── 8. La limpieza diaria ──────────────────────────────────────────
-- La de SQL ya no toca las fotos: si borrara el mensaje, se perdería
-- la ruta y el archivo quedaría huérfano. Las fotos (y su mensaje) las
-- borra `limpiar-chats`, que pg_cron llama todos los días a las 3:15
-- a. m. de Costa Rica con una llave guardada en el Vault.
--
-- La llave la genera la propia base (nadie la escribe ni la ve) y la
-- función la verifica con `es_llave_de_limpieza`, que solo puede
-- llamar el service_role.

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
      and p.chat_abierto_en <= now() - interval '7 days'
      and x.tipo <> 'foto';
    get diagnostics v_cuantos = row_count;
    return v_cuantos;
end;
$$;

revoke all on function public.borrar_chats_vencidos() from public, anon, authenticated;

do $$
begin
    if not exists (select 1 from vault.secrets s where s.name = 'limpiar_chats_secreto') then
        perform vault.create_secret(
            replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
            'limpiar_chats_secreto',
            'Llave con la que pg_cron llama a la función limpiar-chats'
        );
    end if;
end
$$;

create or replace function public.es_llave_de_limpieza(p_llave text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(p_llave, '') <> '' and exists (
        select 1 from vault.decrypted_secrets s
        where s.name = 'limpiar_chats_secreto'
          and s.decrypted_secret = p_llave
    );
$$;

revoke all on function public.es_llave_de_limpieza(text) from public, anon, authenticated;
grant execute on function public.es_llave_de_limpieza(text) to service_role;

do $$
begin
    create extension if not exists pg_net with schema extensions;
exception when others then
    raise notice 'pg_net no disponible: %', sqlerrm;
end
$$;

do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron')
       and exists (select 1 from pg_extension where extname = 'pg_net') then
        perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'limpiar-fotos-de-chats';
        perform cron.schedule(
            'limpiar-fotos-de-chats',
            '15 9 * * *',
            $cmd$
            select net.http_post(
                url := 'https://hrzapdkiiwlgckzrrekl.supabase.co/functions/v1/limpiar-chats',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-tarea', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'limpiar_chats_secreto'), '')
                ),
                body := '{}'::jsonb
            );
            $cmd$
        );
    end if;
end
$$;


notify pgrst, 'reload schema';
