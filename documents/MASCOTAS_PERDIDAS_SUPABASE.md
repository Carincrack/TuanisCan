# Mascotas perdidas en Supabase

Este documento describe lo implementado en Supabase para reportes de mascotas perdidas, Storage de fotos y busqueda geoespacial.

Documentos relacionados:

- [AVISTAMIENTOS_SUPABASE.md](AVISTAMIENTOS_SUPABASE.md)
- [MATCHES_MASCOTAS_SUPABASE.md](MATCHES_MASCOTAS_SUPABASE.md)

## 1. Objetivo

El modulo permite publicar reportes de mascotas perdidas, guardar una referencia a la foto subida en Storage, consultar reportes activos cerca de una ubicacion y cerrar un reporte cuando la mascota se marca como encontrada.

## 2. Tabla `public.mascotas_perdidas`

Creada en `supabase/migrations/20260824052233_create_mascotas_perdidas_table.sql` y extendida en `supabase/migrations/20260824053333_add_especie_to_mascotas_perdidas.sql`.

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_reporte` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador del reporte. |
| `id_mascota` | `uuid` | FK a `public.mascotas(id_mascota)`, `on delete set null` | Mascota registrada relacionada. Puede ser `null`. |
| `id_usuario_reporta` | `uuid` | `not null`, FK a `public.usuarios(id_usuario)`, `on delete cascade` | Usuario que crea el reporte. |
| `zona_id` | `uuid` | `not null`, FK a `public.zonas(id_zona)`, `on delete restrict` | Zona del reporte. |
| `estado` | `public.estado_mascota_perdida` | `not null`, `default 'perdida'` | Estado del reporte. |
| `descripcion` | `text` | `not null` | Descripcion de la mascota o situacion. |
| `foto` | `text` | `not null` | Ruta/referencia de la imagen en Storage. |
| `latitud` | `numeric(9, 6)` | `not null`, `check between -90 and 90` | Latitud del punto del reporte. |
| `longitud` | `numeric(10, 6)` | `not null`, `check between -180 and 180` | Longitud del punto del reporte. |
| `recompensa` | `numeric(10, 2)` | `check recompensa is null or recompensa >= 0` | Recompensa opcional. |
| `fecha_reporte` | `timestamptz` | `not null`, `default now()` | Fecha de creacion del reporte. |
| `fecha_resuelto` | `timestamptz` | Sin `not null` | Fecha de cierre cuando pasa a encontrada. |
| `especie` | `varchar(50)` | `not null` | Especie usada para busqueda y matches. |

Relaciones:

```text
public.usuarios
        |
        | 1 : N
        v
public.mascotas_perdidas
        ^
        | 0..1
public.mascotas

public.zonas
        |
        | 1 : N
        v
public.mascotas_perdidas
```

Indices creados:

| Indice | Uso |
| --- | --- |
| `mascotas_perdidas_id_mascota_idx` | Busqueda por mascota relacionada. |
| `mascotas_perdidas_usuario_idx` | Busqueda por usuario que reporta. |
| `mascotas_perdidas_zona_idx` | Filtro por zona. |
| `mascotas_perdidas_estado_idx` | Filtro por estado. |
| `mascotas_perdidas_especie_idx` | Filtro por `lower(especie)`. |

## 3. Estado del reporte

Enum real:

```sql
public.estado_mascota_perdida
```

Valores:

- `perdida`
- `encontrada`

Flujo:

```text
perdida
   |
   v
mascota recuperada
   |
   v
encontrada
```

`fecha_resuelto` se asigna con `now()` cuando el estado cambia de `perdida` a `encontrada`. La version final de `public.protect_mascota_perdida_system_fields()` esta en `20260824055926_create_marcar_mascota_encontrada_function.sql`.

## 4. Publicacion segura por RPC

La firma final esta en `supabase/migrations/20260824053333_add_especie_to_mascotas_perdidas.sql`:

```sql
public.reportar_mascota_perdida(
    p_id_mascota uuid,
    p_especie text,
    p_zona_id uuid,
    p_descripcion text,
    p_foto text,
    p_latitud numeric,
    p_longitud numeric,
    p_recompensa numeric default null
)
```

Retorna `uuid`, el `id_reporte` creado.

Validaciones reales:

| Validacion | Regla |
| --- | --- |
| Usuario | Usa `auth.uid()` y exige usuario autenticado. |
| Mascota registrada | Si `p_id_mascota` no es `null`, debe existir en `public.mascotas` y pertenecer al usuario. |
| Especie | Si no hay mascota registrada, `p_especie` es obligatorio. Si hay mascota registrada, se toma `m.especie`. |
| Descripcion | Obligatoria y con `trim()`. |
| Foto | Obligatoria. La primera carpeta de `p_foto` debe ser el UUID del usuario. |
| Coordenadas | Latitud entre `-90` y `90`; longitud entre `-180` y `180`. |
| Recompensa | Opcional, pero no negativa. |

El frontend no controla directamente `id_usuario_reporta`, `estado`, `fecha_reporte` ni `fecha_resuelto`; PostgreSQL los deriva o aplica defaults.

Flujo:

```text
Frontend
    |
    v
sube foto
    |
    v
obtiene ruta Storage
    |
    v
reportar_mascota_perdida(...)
    |
    v
PostgreSQL valida
    |
    v
public.mascotas_perdidas
```

Permisos:

- `revoke all ... from public`
- `grant execute ... to authenticated`

## 5. Storage de fotos

Las policies estan en `supabase/migrations/20260824052831_add_storage_mascotas_perdidas_policies.sql`.

Bucket referenciado:

```text
mascotas-perdidas
```

Estructura esperada:

```text
{auth.uid()}/archivo
```

Policies reales sobre `storage.objects`:

| Policy | Operacion | Usuario | Regla |
| --- | --- | --- | --- |
| `usuarios_upload_own_mascotas_perdidas` | `insert` | `authenticated` | Solo permite subir a `bucket_id = 'mascotas-perdidas'` y carpeta inicial igual a `auth.uid()`. |
| `authenticated_select_mascotas_perdidas` | `select` | `authenticated` | Permite ver objetos del bucket `mascotas-perdidas`. |
| `usuarios_delete_own_mascotas_perdidas` | `delete` | `authenticated` | Solo permite eliminar objetos de la carpeta propia. |

La imagen fisica vive en Supabase Storage. `public.mascotas_perdidas.foto` guarda una ruta/referencia, no bytes de imagen.

No se encontro una migracion que cree el bucket en `storage.buckets` ni que configure explicitamente su privacidad.

## 6. RLS de `public.mascotas_perdidas`

RLS se habilita en `supabase/migrations/20260824052446_add_rls_to_mascotas_perdidas.sql`.

| Policy | Operacion | Usuario | Regla |
| --- | --- | --- | --- |
| `mascotas_perdidas_select_authenticated` | `select` | `authenticated` | Permite consultar reportes con `using (true)`. |
| `mascotas_perdidas_insert_own` | `insert` | `authenticated` | Permite insertar solo si `id_usuario_reporta = auth.uid()`. |
| `mascotas_perdidas_update_own` | `update` | `authenticated` | Permite actualizar reportes propios y exige que sigan siendo propios. |
| `admin_update_all_mascotas_perdidas` | `update` | `authenticated` con rol `admin` | Permite actualizar cualquier reporte si `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'`. |

No se encontro policy de `delete` para `public.mascotas_perdidas`.

Trigger real:

```sql
protect_mascota_perdida_system_fields
```

Funcion real:

```sql
public.protect_mascota_perdida_system_fields()
```

Protecciones finales:

| Campo | Regla |
| --- | --- |
| `id_reporte` | No puede cambiar. |
| `id_usuario_reporta` | No puede cambiar. |
| `fecha_reporte` | No puede cambiar. |
| `estado` | No puede cambiarse directamente salvo admin o bandera interna `app.cambio_estado_mascota_perdida`. |
| `fecha_resuelto` | Se asigna automaticamente cuando pasa de `perdida` a `encontrada`. |

## 7. Busqueda geoespacial

La version final esta en `supabase/migrations/20260824054124_add_especie_filter_to_mascotas_perdidas_search.sql`:

```sql
public.buscar_mascotas_perdidas_cercanas(
    p_latitud double precision,
    p_longitud double precision,
    p_radio_km double precision,
    p_zona_id uuid default null,
    p_especie text default null
)
```

Retorna reportes activos con:

- `id_reporte`
- `id_mascota`
- `id_usuario_reporta`
- `zona_id`
- `especie`
- `descripcion`
- `foto`
- `latitud`
- `longitud`
- `recompensa`
- `fecha_reporte`
- `distancia_km`

Validaciones:

| Parametro | Regla |
| --- | --- |
| `p_latitud` | Entre `-90` y `90`. |
| `p_longitud` | Entre `-180` y `180`. |
| `p_radio_km` | No `null` y mayor que `0`. |

La consulta devuelve solo reportes con `mp.estado = 'perdida'`.

PostGIS usado:

- `extensions.ST_MakePoint`
- `extensions.ST_SetSRID`
- `extensions.ST_DWithin`
- `extensions.ST_Distance`
- `extensions.geography`

Coordenadas:

```text
longitud = X
latitud = Y
SRID = 4326
```

`ST_DWithin` usa `p_radio_km * 1000`. `ST_Distance` calcula metros y se divide entre `1000.0` para devolver kilometros.

Orden real:

```sql
order by distancia_km asc, mp.fecha_reporte desc
```

Flujo:

```text
Ubicacion del usuario
        |
        v
latitud / longitud / radio
        |
        v
PostGIS
        |
        v
mascotas perdidas cercanas
        |
        v
ordenadas por distancia
```

## 8. Filtros por zona y especie

Reglas reales:

```sql
p_zona_id is null or mp.zona_id = p_zona_id
p_especie is null or lower(mp.especie) = lower(trim(p_especie))
```

Casos:

| Parametros | Resultado |
| --- | --- |
| `zona + especie` | Reportes activos dentro del radio, en esa zona y especie. |
| `solo zona` | Reportes activos dentro del radio y zona. |
| `solo especie` | Reportes activos dentro del radio y especie. |
| `sin filtros` | Reportes activos dentro del radio. |

Indice geoespacial:

```sql
mascotas_perdidas_ubicacion_gist_idx
```

Expresion:

```sql
ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography
```

Indice por especie:

```sql
mascotas_perdidas_especie_idx on lower(especie)
```

## 9. Marcar mascota como encontrada

Implementado en `supabase/migrations/20260824055926_create_marcar_mascota_encontrada_function.sql`.

RPC real:

```sql
public.marcar_mascota_encontrada(p_id_reporte uuid)
```

Puede ejecutarla:

- El usuario que creo el reporte.
- Un usuario con `app_metadata.app_role = 'admin'`.

Validaciones:

- Usuario autenticado.
- El reporte existe.
- El usuario tiene permiso.
- El reporte no esta ya en `encontrada`.

La funcion activa internamente:

```sql
app.cambio_estado_mascota_perdida = true
```

Luego actualiza `estado = 'encontrada'`. El trigger asigna `fecha_resuelto = now()`.

Flujo:

```text
estado = perdida
       |
       v
dueno recupera mascota
       |
       v
marcar_mascota_encontrada(...)
       |
       v
estado = encontrada
       |
       v
fecha_resuelto = now()
```

## 10. Seguridad

Medidas implementadas:

- RLS habilitado en `public.mascotas_perdidas`.
- RPCs con `security definer`.
- Uso de `auth.uid()` para asociar reportes al usuario autenticado.
- Uso de `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'` para administracion.
- `revoke all from public` y `grant execute to authenticated` en RPCs.
- Validacion de carpeta Storage para evitar subir o reportar fotos bajo el UUID de otro usuario.
- Campos del sistema protegidos por trigger.

## 11. Responsabilidades del frontend

Corresponde al frontend:

- Pedir ubicacion del dispositivo.
- Seleccionar y subir imagen a Storage.
- Guardar o enviar la ruta `foto`.
- Llamar `reportar_mascota_perdida(...)`.
- Llamar `buscar_mascotas_perdidas_cercanas(...)`.
- Mostrar mapa/feed.
- Crear signed URLs si el bucket se configura como privado fuera de estas migraciones.
- Llamar `marcar_mascota_encontrada(...)` cuando corresponda.

## 12. Migraciones relacionadas

| Migracion | Responsabilidad |
| --- | --- |
| `20260824050000_create_mascotas_table.sql` | Dependencia: tabla `public.mascotas`, usada por reportes y matches. |
| `20260824052233_create_mascotas_perdidas_table.sql` | Crea enum, tabla e indices base de reportes perdidos. |
| `20260824052446_add_rls_to_mascotas_perdidas.sql` | Habilita RLS, policies y trigger inicial de proteccion. |
| `20260824052831_add_storage_mascotas_perdidas_policies.sql` | Crea policies de Storage para `mascotas-perdidas`. |
| `20260824052918_create_reportar_mascota_perdida_function.sql` | Crea primera version de `reportar_mascota_perdida(...)`. |
| `20260824053124_create_search_mascotas_perdidas_cercanas_function.sql` | Crea indice GiST y primera version de busqueda cercana. |
| `20260824053333_add_especie_to_mascotas_perdidas.sql` | Agrega `especie` y reemplaza la RPC de reporte. |
| `20260824054124_add_especie_filter_to_mascotas_perdidas_search.sql` | Agrega indice por especie y reemplaza la busqueda con filtro por especie. |
| `20260824055926_create_marcar_mascota_encontrada_function.sql` | Reemplaza la proteccion de estado y crea `marcar_mascota_encontrada(...)`. |

## 13. Estado actual

| Funcionalidad | Estado |
| --- | --- |
| Tabla `public.mascotas_perdidas` | Completado |
| Enum `public.estado_mascota_perdida` | Completado |
| Relacion opcional con `public.mascotas` | Completado |
| Reporte seguro por RPC | Completado |
| Storage policies para fotos | Completado |
| Creacion/configuracion del bucket por migracion SQL | Pendiente |
| RLS de reportes | Completado |
| Proteccion de campos del sistema | Completado |
| Busqueda geoespacial | Completado |
| Filtro por zona | Completado |
| Filtro por especie | Completado |
| Cierre de reporte como encontrada | Completado |
| Notificaciones automaticas | Pendiente |
| Realtime para alertas | Pendiente |
| Matching con IA/reconocimiento visual | Pendiente |
| Integracion visual con Google Maps | Pendiente |

## 14. Inconsistencias o notas

- `20260824053333_add_especie_to_mascotas_perdidas.sql` agrega `especie varchar(50) not null` sobre una tabla ya existente. Si hubiera datos previos, esa migracion podria requerir backfill antes de aplicarse.
- No se encontro SQL que cree el bucket `mascotas-perdidas`; solo existen policies que lo referencian.
