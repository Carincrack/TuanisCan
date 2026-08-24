# Modulo de paseadores en Supabase

Este documento resume lo que existe actualmente en el repositorio de TuanisCan para el modulo de paseadores. La fuente de verdad son las migraciones SQL dentro de `supabase/migrations/`.

No se documentan funcionalidades no implementadas.

## 1. Objetivo del modulo de paseadores

El modulo permite manejar el perfil especifico de un usuario registrado como paseador. Segun las migraciones actuales, cubre:

- Descripcion del paseador.
- Tarifa base.
- Calificacion promedio.
- Disponibilidad.
- Estado de verificacion.
- Documentos de verificacion.
- Busqueda segura de paseadores.

## 2. Relacion entre usuarios y paseadores

La relacion real es:

```text
public.usuarios
        |
        | 1 : 0..1
        v
public.paseadores
```

`public.paseadores.id_usuario` es `primary key` y tambien `foreign key` hacia `public.usuarios(id_usuario)`.

Se reutiliza el mismo UUID porque `public.usuarios.id_usuario` ya representa al usuario creado desde Supabase Auth. El perfil de paseador extiende ese usuario sin crear una identidad separada.

```text
auth.users.id
        |
        v
public.usuarios.id_usuario
        |
        v
public.paseadores.id_usuario
```

## 3. Tabla `public.paseadores`

Implementada en:

```text
supabase/migrations/20260824040108_create_paseadores_table.sql
```

Campos finales de la tabla, considerando que `20260824041524_create_documentos_paseador_table.sql` elimina `documentos_verificacion`:

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_usuario` | `uuid` | `primary key`, `references public.usuarios(id_usuario)`, `on delete cascade` | Identificador del usuario paseador. Reutiliza el UUID del usuario. |
| `descripcion` | `text` | Sin `not null` | Texto descriptivo del paseador. |
| `tarifa_base` | `numeric(10, 2)` | `check (tarifa_base >= 0)` | Tarifa base del paseador. Puede ser `null`. |
| `calificacion_promedio` | `numeric(3, 2)` | `not null`, `default 0`, `check >= 0 and <= 5` | Calificacion promedio acumulada. |
| `estado_verificacion` | `public.estado_verificacion_paseador` | `not null`, `default 'pendiente'` | Estado interno del proceso de verificacion. |
| `disponible` | `boolean` | `not null`, `default false` | Indica si el paseador aparece como disponible. |

La migracion inicial tambien creo `documentos_verificacion text`, pero esa columna se elimina despues porque los documentos se normalizan en `public.documentos_paseador`.

## 4. Estado de verificacion

El enum real es:

```sql
public.estado_verificacion_paseador
```

Valores encontrados:

- `pendiente`
- `aprobado`
- `rechazado`

Flujo documentado por las migraciones:

```text
Registro como paseador
        |
        v
pendiente
        |
        v
Admin revisa documentos
        |
        v
aprobado / rechazado
```

El propio paseador no puede aprobarse a si mismo: `protect_paseador_system_fields()` bloquea cambios de `estado_verificacion` cuando el JWT no tiene `app_metadata.app_role = 'admin'`. La funcion `verificar_paseador()` tambien valida el rol `admin`.

## 5. Registro automatico del paseador

La funcion `public.handle_new_user()` se crea inicialmente en:

```text
supabase/migrations/20260824034121_create_user_registration_trigger.sql
```

Luego se reemplaza para agregar el perfil de paseador en:

```text
supabase/migrations/20260824040441_extend_registration_for_paseadores.sql
```

Cuando `new.raw_user_meta_data ->> 'tipo_usuario' = 'paseador'`, la base de datos crea automaticamente:

1. `public.usuarios`
2. `public.paseadores`

Flujo real:

```text
Supabase Auth
auth.users
        |
        v
trigger on_auth_user_created
        |
        v
public.handle_new_user()
        |
        v
public.usuarios
        |
        v
si tipo_usuario = 'paseador'
        |
        v
public.paseadores
```

La insercion en `public.paseadores` solo incluye `id_usuario = new.id`; los demas campos usan defaults o quedan `null`. El frontend no debe insertar directamente en `public.paseadores` durante el registro.

## 6. RLS de `public.paseadores`

Implementado en:

```text
supabase/migrations/20260824040725_add_rls_to_paseadores.sql
```

La migracion habilita RLS:

```sql
alter table public.paseadores
enable row level security;
```

Policies reales:

| Policy | Operacion | Quien | Alcance |
| --- | --- | --- | --- |
| `paseadores_select_own` | `select` | `authenticated` | Permite leer la fila donde `auth.uid() = id_usuario`, aunque este pendiente o rechazada. |
| `paseadores_select_approved` | `select` | `authenticated` | Permite leer paseadores con `estado_verificacion = 'aprobado'`. |
| `admin_select_all_paseadores` | `select` | `authenticated` con rol `admin` | Permite leer todos los paseadores si `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'`. |
| `paseadores_update_own` | `update` | `authenticated` | Permite actualizar solo la fila propia y exige que siga siendo propia en `with check`. |
| `admin_update_all_paseadores` | `update` | `authenticated` con rol `admin` | Permite actualizar cualquier perfil si el JWT tiene `app_role = 'admin'`. |

No se encontraron policies de `insert` ni `delete` para `public.paseadores`.

Segun estas policies, el paseador puede consultar y actualizar su propio perfil. Usuarios autenticados pueden consultar paseadores aprobados. El administrador puede consultar y actualizar todos los perfiles.

## 7. Proteccion de campos sensibles

Implementado en:

```text
supabase/migrations/20260824040725_add_rls_to_paseadores.sql
```

La funcion real es:

```sql
public.protect_paseador_system_fields()
```

El trigger real es:

```sql
protect_paseador_system_fields
```

Se ejecuta `before update on public.paseadores`.

| Campo | Proteccion |
| --- | --- |
| `id_usuario` | Nunca puede modificarse. |
| `estado_verificacion` | Solo puede modificarlo un usuario con `app_metadata.app_role = 'admin'`. |
| `calificacion_promedio` | Solo puede modificarla un usuario con `app_metadata.app_role = 'admin'`. |

Como el trigger no bloquea otros campos, el paseador puede actualizar normalmente campos propios permitidos por RLS como:

- `descripcion`
- `tarifa_base`
- `disponible`

La calificacion y el estado de verificacion quedan protegidos porque no deben depender de edicion directa del paseador.

## 8. Busqueda de paseadores

Implementada en:

```text
supabase/migrations/20260824040928_create_search_paseadores_function.sql
```

Funcion real:

```sql
public.buscar_paseadores(
    p_zona_id uuid default null,
    p_solo_disponibles boolean default true,
    p_calificacion_min numeric default null
)
```

Retorna:

| Campo devuelto | Origen |
| --- | --- |
| `id_usuario` | `public.usuarios` |
| `nombre` | `public.usuarios` |
| `foto_perfil` | `public.usuarios` |
| `zona_id` | `public.usuarios` |
| `descripcion` | `public.paseadores` |
| `tarifa_base` | `public.paseadores` |
| `calificacion_promedio` | `public.paseadores` |
| `disponible` | `public.paseadores` |

Filtros reales:

| Parametro | Regla |
| --- | --- |
| `p_zona_id` | Si no es `null`, exige `u.zona_id = p_zona_id`. |
| `p_solo_disponibles` | Si es `true`, exige `p.disponible = true`; si es `false`, no filtra por disponibilidad. |
| `p_calificacion_min` | Si no es `null`, exige `p.calificacion_promedio >= p_calificacion_min`. |

La funcion solo devuelve paseadores:

- Con `p.estado_verificacion = 'aprobado'`.
- Con `u.activo = true`.
- Con `u.tipo_usuario = 'paseador'`.

Ordena por `calificacion_promedio desc` y luego `tarifa_base asc nulls last`.

Permisos:

- `revoke all ... from public`
- `grant execute ... to authenticated`

Flujo:

```text
Frontend
    |
    v
supabase.rpc('buscar_paseadores', ...)
    |
    v
PostgreSQL
    |
    v
public.usuarios + public.paseadores
    |
    v
datos publicos del paseador
```

Esta RPC evita exponer directamente toda la tabla `public.usuarios`, porque retorna solo los campos definidos por la funcion.

## 9. Supabase Storage para documentos

Implementado parcialmente en:

```text
supabase/migrations/20260824041316_add_storage_paseadores_verificacion_policies.sql
```

Bucket referenciado:

```text
paseadores-verificacion
```

Estructura esperada por las policies:

```text
paseadores-verificacion/{UUID_USUARIO}/archivo
```

Los archivos reales viven en Supabase Storage. PostgreSQL no almacena fisicamente el PDF o imagen; guarda referencias mediante `ruta_storage` en `public.documentos_paseador`.

No se encontro una migracion que inserte el bucket en `storage.buckets` ni una definicion SQL de privacidad del bucket. Lo que si existe son policies sobre `storage.objects` que restringen acceso por `bucket_id` y carpeta del usuario.

## 10. Policies de Storage

Implementadas sobre `storage.objects` en:

```text
supabase/migrations/20260824041316_add_storage_paseadores_verificacion_policies.sql
```

| Policy | Operacion | Usuario | Regla |
| --- | --- | --- | --- |
| `paseadores_upload_own_documents` | `insert` | `authenticated` | `bucket_id = 'paseadores-verificacion'` y primera carpeta igual a `auth.uid()`. |
| `paseadores_select_own_documents` | `select` | `authenticated` | Lee solo objetos del bucket cuya primera carpeta sea `auth.uid()`. |
| `paseadores_delete_own_documents` | `delete` | `authenticated` | Elimina solo objetos del bucket cuya primera carpeta sea `auth.uid()`. |
| `admin_select_all_paseador_documents` | `select` | `authenticated` con rol `admin` | Lee todos los objetos del bucket si `app_metadata.app_role = 'admin'`. |

Las policies usan:

```sql
(storage.foldername(name))[1]
```

Eso toma la primera carpeta de la ruta del objeto. Por ejemplo, en `UUID/archivo.pdf`, la primera carpeta debe coincidir con el UUID del usuario autenticado. Asi un paseador no puede acceder a documentos de otro paseador mediante estas policies.

No se encontro policy de `update` sobre `storage.objects`.

## 11. Tabla `public.documentos_paseador`

Implementada en:

```text
supabase/migrations/20260824041524_create_documentos_paseador_table.sql
```

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_documento` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador unico del registro de documento. |
| `id_usuario` | `uuid` | `not null`, `references public.paseadores(id_usuario)`, `on delete cascade` | Paseador propietario del documento. |
| `ruta_storage` | `text` | `not null`, `unique` | Ruta o referencia del archivo en Supabase Storage. |
| `fecha_subida` | `timestamptz` | `not null`, `default now()` | Fecha y hora de subida registrada en PostgreSQL. |

Relacion:

```text
public.paseadores
        |
        | 1 : N
        v
public.documentos_paseador
```

`ruta_storage` contiene la referencia al archivo del bucket; no contiene el archivo en si.

## 12. RLS de `public.documentos_paseador`

Implementado en:

```text
supabase/migrations/20260824041709_add_rls_to_documentos_paseador.sql
```

La migracion habilita RLS:

```sql
alter table public.documentos_paseador
enable row level security;
```

Policies reales:

| Policy | Operacion | Quien | Alcance |
| --- | --- | --- | --- |
| `documentos_paseador_select_own` | `select` | `authenticated` | Permite leer documentos donde `id_usuario = auth.uid()`. |
| `documentos_paseador_insert_own` | `insert` | `authenticated` | Permite insertar si `id_usuario = auth.uid()` y `split_part(ruta_storage, '/', 1) = auth.uid()::text`. |
| `documentos_paseador_delete_own` | `delete` | `authenticated` | Permite borrar referencias donde `id_usuario = auth.uid()`. |
| `admin_select_all_documentos_paseador` | `select` | `authenticated` con rol `admin` | Permite leer todos los documentos si `app_metadata.app_role = 'admin'`. |

No se encontro policy de `update` para `public.documentos_paseador`.

El `insert` valida dos cosas: que el documento pertenezca al usuario autenticado por `id_usuario`, y que la primera carpeta de `ruta_storage` sea tambien su UUID.

## 13. Operacion administrativa de verificacion

Implementada en:

```text
supabase/migrations/20260824041838_create_verificar_paseador_function.sql
```

Funcion real:

```sql
public.verificar_paseador(
    p_id_usuario uuid,
    p_estado text
)
```

Validaciones reales:

| Validacion | Regla |
| --- | --- |
| Rol admin | Exige `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'`. |
| Estado permitido | Solo acepta `aprobado` o `rechazado`. |
| Existencia | Verifica que exista una fila en `public.paseadores` con `id_usuario = p_id_usuario`. |

Si las validaciones pasan, actualiza:

```sql
public.paseadores.estado_verificacion =
    p_estado::public.estado_verificacion_paseador
```

Permisos:

- `revoke all ... from public`
- `grant execute ... to authenticated`

Flujo:

```text
Admin
    |
    v
revisa documentos
    |
    v
verificar_paseador(...)
    |
    v
verifica app_role
    |
    v
aprobado / rechazado
```

## 14. Flujo completo del modulo

```text
Usuario selecciona paseador
        |
        v
Supabase Auth
        |
        v
public.usuarios
        |
        v
public.paseadores
estado = pendiente
        |
        v
sube documentos
        |
        v
Storage con policies por carpeta UUID
        |
        v
public.documentos_paseador
        |
        v
Admin revisa
        |
        v
verificar_paseador()
        |
        v
aprobado / rechazado
        |
        v
si esta aprobado
        |
        v
puede aparecer en buscar_paseadores()
```

## 15. Migraciones relacionadas

| Migracion | Descripcion |
| --- | --- |
| `20260824034121_create_user_registration_trigger.sql` | Crea `public.handle_new_user()` y el trigger `on_auth_user_created` sobre `auth.users`. |
| `20260824040108_create_paseadores_table.sql` | Crea el enum `public.estado_verificacion_paseador` y la tabla `public.paseadores`. |
| `20260824040441_extend_registration_for_paseadores.sql` | Reemplaza `public.handle_new_user()` para crear `public.paseadores` cuando `tipo_usuario = 'paseador'`. |
| `20260824040725_add_rls_to_paseadores.sql` | Habilita RLS en `public.paseadores`, crea policies de `select`/`update`, y agrega `protect_paseador_system_fields()`. |
| `20260824040928_create_search_paseadores_function.sql` | Crea la RPC `public.buscar_paseadores(...)`. |
| `20260824041316_add_storage_paseadores_verificacion_policies.sql` | Crea policies sobre `storage.objects` para documentos del bucket `paseadores-verificacion`. |
| `20260824041524_create_documentos_paseador_table.sql` | Crea `public.documentos_paseador` y elimina `public.paseadores.documentos_verificacion`. |
| `20260824041709_add_rls_to_documentos_paseador.sql` | Habilita RLS en `public.documentos_paseador` y crea policies de `select`, `insert` y `delete`. |
| `20260824041838_create_verificar_paseador_function.sql` | Crea `public.verificar_paseador(...)` para aprobar o rechazar paseadores desde rol `admin`. |

## 16. Estado actual

| Funcionalidad | Estado |
| --- | --- |
| Tabla `public.paseadores` | Implementado |
| Enum `public.estado_verificacion_paseador` | Implementado |
| Creacion automatica del perfil de paseador en registro | Implementado |
| RLS de `public.paseadores` | Implementado |
| Proteccion de campos sensibles de paseador | Implementado |
| Busqueda por zona, disponibilidad y calificacion minima | Implementado |
| Policies de Storage para `paseadores-verificacion` | Implementado |
| Creacion/configuracion privada del bucket por migracion SQL | No encontrado en migraciones |
| Multiples documentos en `public.documentos_paseador` | Implementado |
| RLS de `public.documentos_paseador` | Implementado |
| Aprobacion/rechazo por admin con `verificar_paseador()` | Implementado |
| Solicitud de paseos | Pendiente |
| Historial de paseos | Pendiente |
| Resenas reales | Pendiente |
| Calculo automatico de calificacion | Pendiente |
| Tracking en tiempo real | Pendiente |
| Chat | Pendiente |
| Pagos | Pendiente |
