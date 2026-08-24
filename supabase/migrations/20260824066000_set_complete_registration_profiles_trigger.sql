-- Renombra el trigger de registro para usar el nombre solicitado.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists complete_registration_profiles on auth.users;

create trigger complete_registration_profiles
after insert on auth.users
for each row
execute function public.handle_new_user();
