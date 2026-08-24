-- ============================================================
-- TABLA: DOCUMENTOS DE VERIFICACIÓN DEL PASEADOR
-- ============================================================

create table public.documentos_paseador (
    id_documento uuid primary key default gen_random_uuid(),

    id_usuario uuid not null
        references public.paseadores(id_usuario)
        on delete cascade,

    ruta_storage text not null unique,

    fecha_subida timestamptz not null default now()
);


-- ============================================================
-- ELIMINAR CAMPO ANTERIOR
-- La información de documentos ahora se normaliza
-- en public.documentos_paseador.
-- ============================================================

alter table public.paseadores
drop column documentos_verificacion;