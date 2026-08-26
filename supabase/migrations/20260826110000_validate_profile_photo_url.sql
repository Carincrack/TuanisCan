-- Evita que una imagen Base64 infle user_metadata y, por tanto, el JWT.

create or replace function public.set_user_app_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tipo_usuario text;
    v_foto_perfil text;
begin
    v_tipo_usuario := new.raw_user_meta_data ->> 'tipo_usuario';
    v_foto_perfil := new.raw_user_meta_data ->> 'foto_perfil';

    if v_tipo_usuario in ('dueno', 'paseador', 'negocio') then
        new.raw_app_meta_data := jsonb_set(
            coalesce(new.raw_app_meta_data, '{}'::jsonb),
            '{app_role}',
            to_jsonb(v_tipo_usuario),
            true
        );
    end if;

    if v_foto_perfil is not null
       and (
           length(v_foto_perfil) > 2048
           or v_foto_perfil !~* '^https?://'
       ) then
        new.raw_user_meta_data :=
            coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'foto_perfil';
    end if;

    return new;
end;
$$;

alter table public.usuarios
add constraint usuarios_foto_perfil_url_check
check (
    foto_perfil is null
    or (
        length(foto_perfil) <= 2048
        and foto_perfil ~* '^https?://'
    )
) not valid;
