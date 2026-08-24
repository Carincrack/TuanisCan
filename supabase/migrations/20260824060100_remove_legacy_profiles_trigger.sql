-- Elimina el trigger antiguo que intentaba insertar en public.perfiles.
-- El perfil actual se crea mediante handle_new_user() en public.usuarios.

DO $$
DECLARE
    legacy_trigger record;
BEGIN
    FOR legacy_trigger IN
                SELECT
                        table_namespace.nspname AS trigger_schema,
                        trigger_definition.tgname AS trigger_name
                FROM pg_trigger AS trigger_definition
                JOIN pg_class AS trigger_table
                    ON trigger_table.oid = trigger_definition.tgrelid
                JOIN pg_namespace AS table_namespace
                    ON table_namespace.oid = trigger_table.relnamespace
                JOIN pg_proc AS trigger_function
                    ON trigger_function.oid = trigger_definition.tgfoid
                JOIN pg_namespace AS trigger_namespace
                    ON trigger_namespace.oid = trigger_function.pronamespace
                WHERE table_namespace.nspname = 'auth'
                    AND trigger_table.relname = 'users'
                    AND trigger_function.pronamespace = 'public'::regnamespace
                    AND trigger_function.proname = 'crear_perfil_de_usuario'
                    AND NOT trigger_definition.tgisinternal
    LOOP
        EXECUTE format(
            'drop trigger if exists %I on %I.%I',
            legacy_trigger.trigger_name,
            legacy_trigger.trigger_schema,
            'users'
        );
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.crear_perfil_de_usuario();
