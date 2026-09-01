-- El rol de paseador se otorga al crear el perfil, no al aprobarlo.
--
-- PROBLEMA
-- public.usuario_rol servia para dos cosas a la vez: decidir que panel abre
-- la cuenta (lo lee obtener_mi_perfil y con eso el frontend monta el shell)
-- y marcar si administracion ya aprobo al paseador. Como handle_new_user
-- solo inserta el rol para 'dueno' y 'negocio', quien se registraba como
-- paseador entraba con roles = [], el frontend no tenia panel que montar y
-- caia en "Esta cuenta no tiene perfiles activos". Quedaba fuera antes de
-- poder subir un solo documento.
--
-- POR QUE UN TRIGGER Y NO TOCAR LAS FUNCIONES
-- La fila en public.paseadores ya se crea en los dos caminos que existen
-- —handle_new_user al registrarse y solicitar_perfil_paseador desde la
-- aplicacion—. Colgarse de ese insert cubre ambos sin reescribir ninguna
-- funcion, que es donde estaria el choque si un companero las esta editando.
--
-- QUE NO CAMBIA
-- Quien puede ejercer se controlaba aparte y sigue igual:
--
--   buscar_paseadores ....... exige p.estado_verificacion = 'aprobado'
--                             y u.estado_verificacion = 'aprobado'
--   solicitar_paseo ......... exige p.estado_verificacion = 'aprobado'
--                             y p.disponible = true
--   trigger validar_paseador_verificado_en_paseo sobre public.paseos
--   trigger exigir_usuario_verificado sobre mascotas, paseos, pagos,
--           resenas, mensajes y 7 tablas mas
--
-- Ninguno mira el rol para decidir. Un paseador sin aprobar entra al panel,
-- ve su agenda vacia y no aparece en las busquedas: nadie puede reservarle,
-- y si intentara responder una solicitud el trigger lo frena.

create or replace function public.otorgar_rol_paseador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.usuario_rol (id_usuario, id_rol)
    select new.id_usuario, r.id_rol
    from public.rol r
    where r.nombre::text = 'paseador'
    on conflict do nothing;

    return new;
end;
$$;

drop trigger if exists otorgar_rol_paseador on public.paseadores;
create trigger otorgar_rol_paseador
after insert on public.paseadores
for each row execute function public.otorgar_rol_paseador();

-- Las cuentas que se registraron como paseador antes de este cambio tienen
-- su fila en public.paseadores y ningun rol. Sin esto siguen viendo la misma
-- pantalla para siempre.
insert into public.usuario_rol (id_usuario, id_rol)
select p.id_usuario, r.id_rol
from public.paseadores p
cross join public.rol r
where r.nombre::text = 'paseador'
on conflict do nothing;
