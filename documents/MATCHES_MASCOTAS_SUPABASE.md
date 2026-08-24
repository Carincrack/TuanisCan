# Matches de mascotas en Supabase

Este documento describe lo implementado para coincidencias entre reportes de mascotas perdidas y mascotas registradas.

Documentos relacionados:

- [MASCOTAS_PERDIDAS_SUPABASE.md](MASCOTAS_PERDIDAS_SUPABASE.md)
- [AVISTAMIENTOS_SUPABASE.md](AVISTAMIENTOS_SUPABASE.md)

## 1. Objetivo

El modulo genera posibles coincidencias entre un reporte de mascota perdida y mascotas registradas en la plataforma. Tambien permite consultar matches desde ambos lados, resolverlos como `confirmado` o `descartado`, y cerrar el reporte cuando la mascota fue encontrada.

No es reconocimiento visual ni inteligencia artificial. La generacion actual usa una heuristica de MVP basada en especie, zona y texto descriptivo.

## 2. Tabla `public.matches`

Creada en `supabase/migrations/20260824054709_create_matches_table.sql` y extendida en `supabase/migrations/20260824055111_create_match_generation_logic.sql`.

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_match` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador del match. |
| `id_reporte` | `uuid` | `not null`, FK a `public.mascotas_perdidas(id_reporte)`, `on delete cascade` | Reporte de mascota perdida. |
| `id_mascota` | `uuid` | `not null`, FK a `public.mascotas(id_mascota)`, `on delete cascade` | Mascota registrada candidata. |
| `puntaje_coincidencia` | `numeric` | `not null`, check `0 <= puntaje <= 100` | Puntaje heuristico de coincidencia. |
| `estado` | `public.estado_match` | `not null`, `default 'pendiente'` | Estado del match. |
| `fecha_match` | `timestamptz` | `not null`, `default now()` | Fecha de generacion del match. |

Restriccion unica real:

```sql
unique (id_reporte, id_mascota)
```

Relaciones:

```text
public.mascotas_perdidas
        |
        v
public.matches
        ^
        |
public.mascotas
```

Indices:

| Indice | Uso |
| --- | --- |
| `matches_id_reporte_idx` | Consultar matches de un reporte. |
| `matches_id_mascota_idx` | Consultar matches de una mascota registrada. |
| `matches_estado_idx` | Filtrar por estado. |

## 3. Estado del match

Enum real:

```sql
public.estado_match
```

Valores:

- `pendiente`: posible coincidencia todavia no resuelta.
- `confirmado`: el dueno de la mascota candidata o admin confirmo la coincidencia.
- `descartado`: la coincidencia fue rechazada o descartada al confirmar otro candidato.

## 4. RLS de `public.matches`

Implementado en `supabase/migrations/20260824054756_add_rls_to_matches.sql`.

RLS se habilita con:

```sql
alter table public.matches enable row level security;
```

Policies reales:

| Policy | Operacion | Usuario | Regla |
| --- | --- | --- | --- |
| `matches_select_report_owner` | `select` | `authenticated` | Puede leer si creo el reporte en `public.mascotas_perdidas`. |
| `matches_select_pet_owner` | `select` | `authenticated` | Puede leer si es dueno de la mascota candidata en `public.mascotas`. |
| `admin_select_all_matches` | `select` | `authenticated` con rol `admin` | Puede leer todos los matches si `app_metadata.app_role = 'admin'`. |

No se encontraron policies directas de `insert`, `update` ni `delete` para `public.matches`. La generacion y resolucion ocurren por funciones.

## 5. Generacion automatica de matches

Implementada en `supabase/migrations/20260824055111_create_match_generation_logic.sql`.

Funcion interna:

```sql
public.generar_matches_reporte(p_id_reporte uuid)
```

Retorna `integer`, usando `row_count` despues del `insert ... on conflict do update`.

Condiciones reales:

- El reporte debe existir.
- Solo procesa reportes con `estado = 'perdida'`.
- Si `mascotas_perdidas.id_mascota` ya tiene valor, retorna `0` porque la identidad ya es conocida.
- Busca mascotas cuyo dueno tenga `public.usuarios.activo = true`.
- Exige misma zona: `u.zona_id = v_reporte.zona_id`.
- Exige misma especie, comparada con `lower(trim(...))`.

Puntaje real:

| Criterio | Puntos |
| --- | --- |
| Base por especie y zona coincidente | `50` |
| `raza` aparece en `descripcion` | `+20` |
| `color` aparece en `descripcion` | `+15` |
| `sexo` aparece en `descripcion` | `+15` |

Rango total protegido por constraint:

```text
0 a 100
```

Duplicados:

```sql
on conflict (id_reporte, id_mascota)
do update set puntaje_coincidencia = excluded.puntaje_coincidencia
where public.matches.estado = 'pendiente'
```

Esto evita duplicar el mismo par reporte/mascota. Si el match ya existe y sigue pendiente, actualiza el puntaje. Si ya fue resuelto, no lo recalcula.

Trigger:

```sql
generar_matches_al_reportar_mascota
```

Funcion de trigger:

```sql
public.handle_generar_matches_reporte()
```

Se ejecuta `after insert on public.mascotas_perdidas` y llama `public.generar_matches_reporte(new.id_reporte)`.

## 6. Consultar matches desde un reporte

Implementado en `supabase/migrations/20260824055543_create_obtener_matches_reporte_function.sql`.

RPC:

```sql
public.obtener_matches_reporte(p_id_reporte uuid)
```

Puede ejecutarla:

- El usuario que creo el reporte.
- Un usuario con `app_metadata.app_role = 'admin'`.

Devuelve datos de la mascota candidata:

- `id_match`
- `id_mascota`
- `nombre`
- `especie`
- `raza`
- `sexo`
- `color`
- `foto`
- `puntaje_coincidencia`
- `estado`
- `fecha_match`

No devuelve campos como `id_dueno`, `peso`, `microchip`, `alergias` ni `fecha_nacimiento`.

Orden:

```sql
puntaje_coincidencia desc, fecha_match desc
```

Flujo:

```text
Dueno del reporte
       |
       v
obtener_matches_reporte(...)
       |
       v
matches + mascotas
       |
       v
posibles candidatos
```

## 7. Consultar matches desde una mascota

Implementado en `supabase/migrations/20260824055725_create_obtener_matches_mascota_function.sql`.

RPC:

```sql
public.obtener_matches_mascota(p_id_mascota uuid)
```

Puede ejecutarla:

- El dueno de la mascota registrada.
- Un usuario con `app_metadata.app_role = 'admin'`.

Devuelve informacion del reporte:

- `id_match`
- `id_reporte`
- `especie`
- `descripcion`
- `foto`
- `zona_id`
- `latitud`
- `longitud`
- `recompensa`
- `fecha_reporte`
- `puntaje_coincidencia`
- `estado_match`
- `estado_reporte`

Orden:

```sql
puntaje_coincidencia desc, fecha_match desc
```

Flujo:

```text
Dueno de mascota registrada
       |
       v
obtener_matches_mascota(...)
       |
       v
posibles reportes coincidentes
```

## 8. Resolver match

Implementado en `supabase/migrations/20260824055836_create_resolver_match_function.sql`.

RPC:

```sql
public.resolver_match(
    p_id_match uuid,
    p_estado text
)
```

Estados permitidos por esta operacion:

- `confirmado`
- `descartado`

Puede resolver:

- El dueno de la mascota candidata.
- Un usuario con `app_metadata.app_role = 'admin'`.

No se encontro que el creador del reporte pueda resolver el match si no es tambien dueno de la mascota candidata.

Validaciones:

- Usuario autenticado.
- Estado solicitado valido.
- Match existente.
- Permiso por dueno de mascota candidata o admin.
- El match debe seguir en `pendiente`.

Si se descarta:

- Actualiza `public.matches.estado = 'descartado'`.

Si se confirma:

- Actualiza ese match a `confirmado`.
- Vincula `public.mascotas_perdidas.id_mascota` con la mascota candidata.
- Descarta otros matches pendientes del mismo reporte.

Importante:

```text
MATCH CONFIRMADO
NO significa automaticamente
MASCOTA ENCONTRADA
```

Confirmar un match identifica que un reporte corresponde a una mascota registrada. El cierre fisico del reporte se hace aparte con `marcar_mascota_encontrada(...)`.

## 9. Marcar mascota como encontrada

Implementado en `supabase/migrations/20260824055926_create_marcar_mascota_encontrada_function.sql`.

RPC:

```sql
public.marcar_mascota_encontrada(p_id_reporte uuid)
```

Puede ejecutarla:

- El usuario que creo el reporte.
- Un usuario con `app_metadata.app_role = 'admin'`.

La funcion cambia el reporte a `estado = 'encontrada'`. El trigger `protect_mascota_perdida_system_fields` asigna `fecha_resuelto = now()`.

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

## 10. Diferencia entre match y recuperacion

```text
match confirmado
=
se identifico que un reporte corresponde a una mascota registrada
```

```text
mascota encontrada
=
la mascota fue fisicamente recuperada
```

Son estados conceptualmente diferentes. Un match confirmado puede ayudar a identificar la mascota, pero no cierra automaticamente el reporte como encontrado.

## 11. Flujo completo

```text
Usuario reporta mascota
        |
        v
sube foto a Storage
        |
        v
reportar_mascota_perdida()
        |
        v
public.mascotas_perdidas
        |
        v
generacion automatica de matches
        |
        v
public.matches
        |
        v
posibles coincidencias

Otros usuarios
        |
        v
registrar_avistamiento()
        |
        v
public.avistamientos
        |
        v
mapa/feed

MATCH pendiente
      |
      v
confirmado / descartado
      |
      v
si la mascota posteriormente aparece
      |
      v
marcar_mascota_encontrada()
      |
      v
reporte cerrado
```

## 12. Funciones y RPC

| Funcion | Tipo | Proposito | Quien puede ejecutarla |
| --- | --- | --- | --- |
| `public.generar_matches_reporte(uuid)` | Interna | Genera o recalcula matches para un reporte. | Sin grant a `public`; llamada por trigger. |
| `public.handle_generar_matches_reporte()` | Trigger | Llama la generacion despues de insertar reporte. | PostgreSQL mediante trigger. |
| `public.obtener_matches_reporte(uuid)` | RPC | Consulta candidatos de un reporte. | `authenticated`, con validacion de dueno del reporte o admin. |
| `public.obtener_matches_mascota(uuid)` | RPC | Consulta reportes candidatos para una mascota registrada. | `authenticated`, con validacion de dueno de mascota o admin. |
| `public.resolver_match(uuid, text)` | RPC | Confirma o descarta un match. | `authenticated`, con validacion de dueno de mascota candidata o admin. |
| `public.marcar_mascota_encontrada(uuid)` | RPC | Cierra un reporte como encontrado. | `authenticated`, con validacion de creador del reporte o admin. |
| `public.protect_mascota_perdida_system_fields()` | Trigger | Protege campos del reporte y asigna `fecha_resuelto`. | PostgreSQL mediante trigger. |

## 13. Seguridad

Medidas implementadas:

- RLS habilitado en `public.matches`.
- RLS de matches solo habilita lectura directa para partes relacionadas y admin.
- Operaciones de escritura se realizan por RPC `security definer`.
- Uso de `auth.uid()` para validar duenos.
- Uso de `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'` para admin.
- `revoke all from public` y `grant execute to authenticated` en RPCs expuestas.
- Restriccion `unique (id_reporte, id_mascota)` para evitar duplicados.
- Constraint de puntaje entre `0` y `100`.

## 14. Responsabilidades del frontend

Corresponde al frontend:

- Mostrar matches del reporte al usuario que reporto.
- Mostrar reportes candidatos al dueno de una mascota registrada.
- Llamar `resolver_match(...)` con `confirmado` o `descartado`.
- Separar visualmente match confirmado de reporte encontrado.
- Llamar `marcar_mascota_encontrada(...)` solo cuando la mascota fue recuperada.
- Mostrar avistamientos y reportes en mapa/feed.

## 15. Migraciones relacionadas

| Migracion | Responsabilidad |
| --- | --- |
| `20260824050000_create_mascotas_table.sql` | Dependencia: tabla `public.mascotas`, campos usados por matching. |
| `20260824052233_create_mascotas_perdidas_table.sql` | Dependencia: tabla de reportes. |
| `20260824054709_create_matches_table.sql` | Crea enum, tabla, unique e indices de matches. |
| `20260824054756_add_rls_to_matches.sql` | Habilita RLS y policies de lectura. |
| `20260824055111_create_match_generation_logic.sql` | Agrega check de puntaje, funcion interna y trigger de generacion. |
| `20260824055543_create_obtener_matches_reporte_function.sql` | Crea RPC para consultar matches desde un reporte. |
| `20260824055725_create_obtener_matches_mascota_function.sql` | Crea RPC para consultar matches desde una mascota. |
| `20260824055836_create_resolver_match_function.sql` | Crea RPC para confirmar o descartar matches. |
| `20260824055926_create_marcar_mascota_encontrada_function.sql` | Crea RPC de cierre del reporte y actualiza proteccion de estado. |

## 16. Funcionalidades pendientes

Segun las migraciones revisadas, no esta implementado:

- Notificaciones automaticas cuando aparece un match.
- Supabase Realtime para alertas.
- Matching mediante IA o reconocimiento de imagenes.
- Busqueda avanzada por mas atributos.
- Pruebas end-to-end.
- Integracion visual con Google Maps.
- Moderacion administrativa completa de matches.

## 17. Estado actual

| Funcionalidad | Estado |
| --- | --- |
| Tabla `public.matches` | Completado |
| Enum `public.estado_match` | Completado |
| Unique reporte/mascota | Completado |
| RLS de lectura | Completado |
| Generacion automatica por trigger | Completado |
| Heuristica de puntaje 0-100 | Completado |
| Consulta desde reporte | Completado |
| Consulta desde mascota | Completado |
| Confirmar/descartar match | Completado |
| Cerrar reporte como encontrado | Completado |
| IA/reconocimiento visual | Pendiente |
| Notificaciones/Realtime | Pendiente |
| Moderacion administrativa completa | Pendiente |

## 18. Inconsistencias o notas

- `resolver_match(...)` permite resolver al dueno de la mascota candidata o al admin. No permite al creador del reporte resolver si no cumple una de esas condiciones.
- Confirmar un match actualiza `mascotas_perdidas.id_mascota`, pero no cambia `estado` a `encontrada`; el cierre se hace con `marcar_mascota_encontrada(...)`.
