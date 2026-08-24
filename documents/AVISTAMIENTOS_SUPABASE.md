# Avistamientos en Supabase

Este documento describe lo implementado para registrar y consultar avistamientos asociados a reportes de mascotas perdidas.

Documentos relacionados:

- [MASCOTAS_PERDIDAS_SUPABASE.md](MASCOTAS_PERDIDAS_SUPABASE.md)
- [MATCHES_MASCOTAS_SUPABASE.md](MATCHES_MASCOTAS_SUPABASE.md)

## 1. Objetivo

El modulo permite que un usuario autenticado registre que vio una mascota reportada como perdida, junto con coordenadas y un comentario opcional. Los avistamientos pueden consultarse para construir un mapa o feed.

## 2. Tabla `public.avistamientos`

Creada en `supabase/migrations/20260824054233_create_avistamientos_table.sql`.

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_avistamiento` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador del avistamiento. |
| `id_reporte` | `uuid` | `not null`, FK a `public.mascotas_perdidas(id_reporte)`, `on delete cascade` | Reporte de mascota perdida asociado. |
| `id_usuario` | `uuid` | `not null`, FK a `public.usuarios(id_usuario)`, `on delete cascade` | Usuario que registro el avistamiento. |
| `latitud` | `numeric(9, 6)` | `not null`, `check between -90 and 90` | Latitud del avistamiento. |
| `longitud` | `numeric(10, 6)` | `not null`, `check between -180 and 180` | Longitud del avistamiento. |
| `comentario` | `text` | Sin `not null` | Comentario opcional. |
| `fecha` | `timestamptz` | `not null`, `default now()` | Fecha de registro. |

Relaciones:

```text
public.mascotas_perdidas
        |
        | 1 : N
        v
public.avistamientos

public.usuarios
        |
        | 1 : N
        v
public.avistamientos
```

Indices:

| Indice | Uso |
| --- | --- |
| `avistamientos_id_reporte_idx` | Buscar avistamientos por reporte. |
| `avistamientos_id_usuario_idx` | Buscar avistamientos por usuario. |
| `avistamientos_fecha_idx` | Ordenar por fecha descendente. |

## 3. RLS de `public.avistamientos`

Implementado en `supabase/migrations/20260824054345_add_rls_to_avistamientos.sql`.

RLS se habilita con:

```sql
alter table public.avistamientos enable row level security;
```

Policy real:

| Policy | Operacion | Usuario | Regla |
| --- | --- | --- | --- |
| `avistamientos_select_authenticated` | `select` | `authenticated` | Permite consultar avistamientos con `using (true)`. |

No se encontraron policies directas de `insert`, `update` ni `delete` para `public.avistamientos`. La escritura se realiza mediante RPC.

## 4. Registrar avistamiento

Implementado en `supabase/migrations/20260824054440_create_registrar_avistamiento_function.sql`.

RPC real:

```sql
public.registrar_avistamiento(
    p_id_reporte uuid,
    p_latitud numeric,
    p_longitud numeric,
    p_comentario text default null
)
```

Retorna `uuid`, el `id_avistamiento` creado.

Validaciones reales:

| Validacion | Regla |
| --- | --- |
| Usuario | Usa `auth.uid()` y exige usuario autenticado. |
| Usuario de aplicacion | Debe existir en `public.usuarios` con `activo = true`. |
| Reporte | Debe existir en `public.mascotas_perdidas` y seguir en `estado = 'perdida'`. |
| Latitud | No puede ser `null`; entre `-90` y `90`. |
| Longitud | No puede ser `null`; entre `-180` y `180`. |
| Comentario | Opcional; `trim('')` se guarda como `null`. |

La fecha se asigna automaticamente con el default `now()` de la tabla.

Flujo:

```text
Usuario ve mascota
      |
      v
registrar_avistamiento(...)
      |
      v
valida reporte activo
      |
      v
valida ubicacion
      |
      v
public.avistamientos
```

Permisos:

- `revoke all ... from public`
- `grant execute ... to authenticated`

## 5. Seguridad

Medidas implementadas:

- RLS habilitado en `public.avistamientos`.
- Lectura directa solo para usuarios autenticados.
- Sin policies directas de escritura.
- RPC con `security definer`.
- Uso de `auth.uid()` para asignar `id_usuario`.
- Validacion de usuario activo.
- Validacion de que el reporte siga abierto como `perdida`.

## 6. Responsabilidades del frontend

Corresponde al frontend:

- Pedir o recibir la ubicacion del avistamiento.
- Mostrar mapa/feed de avistamientos.
- Enviar comentario opcional.
- Llamar `registrar_avistamiento(...)`.
- Mostrar errores de reporte cerrado o coordenadas invalidas.

## 7. Migraciones relacionadas

| Migracion | Responsabilidad |
| --- | --- |
| `20260824052233_create_mascotas_perdidas_table.sql` | Dependencia: tabla de reportes. |
| `20260824054233_create_avistamientos_table.sql` | Crea tabla e indices de avistamientos. |
| `20260824054345_add_rls_to_avistamientos.sql` | Habilita RLS y policy de lectura. |
| `20260824054440_create_registrar_avistamiento_function.sql` | Crea RPC para registrar avistamientos. |

## 8. Estado actual

| Funcionalidad | Estado |
| --- | --- |
| Tabla `public.avistamientos` | Completado |
| Relaciones con reportes y usuarios | Completado |
| Indices por reporte, usuario y fecha | Completado |
| RLS de lectura | Completado |
| Registro por RPC | Completado |
| Insert directo por policy | Pendiente |
| Update directo por policy | Pendiente |
| Delete directo por policy | Pendiente |
| Notificaciones automaticas al dueno del reporte | Pendiente |
| Realtime para avistamientos | Pendiente |
| Moderacion administrativa completa | Pendiente |
