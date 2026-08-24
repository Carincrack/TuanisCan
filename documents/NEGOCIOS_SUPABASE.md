# Modulo de negocios en Supabase

Este documento resume lo que existe actualmente en el repositorio de TuanisCan para el modulo de negocios. La fuente de verdad son las migraciones SQL dentro de `supabase/migrations/`.

No se documentan funcionalidades no implementadas.

## 1. Objetivo del modulo de negocios

El modulo permite registrar y administrar negocios relacionados con mascotas, como:

- Veterinarias.
- Tiendas.
- Refugios.

Tambien permite consultarlos en un directorio geografico mediante una busqueda por coordenadas y radio.

## 2. Relacion entre usuarios y negocios

La relacion real es:

```text
public.usuarios
        |
        | 1 : N
        v
public.negocios
```

`public.negocios.id_propietario` referencia a `public.usuarios.id_usuario`. El campo no tiene `not null`, por lo que puede quedar `null`. La foreign key usa `on delete set null`.

Cada negocio tiene su propio `id_negocio`, generado con `gen_random_uuid()`. El UUID del negocio no es el mismo UUID del usuario, porque un negocio es una entidad independiente: un usuario propietario puede registrar varios establecimientos, y cada establecimiento necesita su propio identificador.

```text
public.usuarios.id_usuario
        |
        | 1 : N
        v
public.negocios.id_propietario

public.negocios.id_negocio = UUID propio del negocio
```

## 3. Tabla `public.negocios`

Implementada en:

```text
supabase/migrations/20260824044045_create_negocios_table.sql
```

Campos reales:

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_negocio` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador unico del negocio. |
| `id_propietario` | `uuid` | `references public.usuarios(id_usuario)`, `on delete set null` | Usuario propietario del negocio. Puede ser `null`. |
| `zona_id` | `uuid` | `references public.zonas(id_zona)`, `on delete set null` | Zona asociada a la ubicacion del establecimiento. Puede ser `null`. |
| `nombre` | `varchar(150)` | `not null` | Nombre del negocio. |
| `tipo` | `public.tipo_negocio` | `not null` | Tipo controlado de negocio. |
| `direccion` | `text` | Sin `not null` | Direccion textual del establecimiento. |
| `latitud` | `numeric(9, 6)` | `check (latitud is null or latitud between -90 and 90)` | Latitud geografica. Puede ser `null`. |
| `longitud` | `numeric(10, 6)` | `check (longitud is null or longitud between -180 and 180)` | Longitud geografica. Puede ser `null`. |
| `telefono` | `varchar(20)` | Sin `not null` | Telefono del negocio. |
| `horario` | `text` | Sin `not null` | Horario textual del negocio. |
| `destacado` | `boolean` | `not null`, `default false` | Marca administrada por la plataforma para destacar negocios. |

## 4. Enum `tipo_negocio`

La migracion `20260824044045_create_negocios_table.sql` crea:

```sql
public.tipo_negocio
```

Valores reales:

- `veterinaria`
- `tienda`
- `refugio`

Este enum controla los tipos validos de establecimiento y evita valores arbitrarios en `public.negocios.tipo`.

## 5. Relacion con zonas

La foreign key real es:

```text
public.negocios.zona_id
        |
        v
public.zonas.id_zona
```

`zona_id` corresponde a la ubicacion del establecimiento. No representa necesariamente la zona personal del propietario guardada en `public.usuarios.zona_id`.

Si una zona se elimina, la migracion define `on delete set null`, por lo que el negocio conserva su fila y `zona_id` pasa a `null`.

## 6. Creacion de negocios

Implementada en:

```text
supabase/migrations/20260824044349_create_negocio_function.sql
```

Funcion real:

```sql
public.crear_negocio(
    p_nombre text,
    p_tipo public.tipo_negocio,
    p_zona_id uuid default null,
    p_direccion text default null,
    p_latitud numeric default null,
    p_longitud numeric default null,
    p_telefono text default null,
    p_horario text default null
)
```

Retorna el `uuid` del negocio creado.

Validaciones reales:

| Validacion | Regla |
| --- | --- |
| Usuario autenticado | Exige que `auth.uid()` no sea `null`. |
| Permiso de negocio | Exige una fila en `public.usuarios` con `id_usuario = auth.uid()`, `tipo_usuario = 'negocio'` y `activo = true`. |
| Nombre | `p_nombre` no puede ser `null` ni quedar vacio despues de `trim()`. |
| Latitud | Si existe, debe estar entre `-90` y `90`. |
| Longitud | Si existe, debe estar entre `-180` y `180`. |

La funcion usa `auth.uid()` como `id_propietario`. El frontend no envia libremente `id_propietario`, lo que evita crear negocios a nombre de otra persona.

Flujo:

```text
Usuario registrado como negocio
        |
        v
auth.users
        |
        v
public.usuarios
tipo_usuario = negocio
        |
        v
crear_negocio(...)
        |
        v
public.negocios
```

Permisos de la RPC:

- `revoke all ... from public`
- `grant execute ... to authenticated`

## 7. Campo `destacado`

La tabla define:

```sql
destacado boolean not null default false
```

Todo negocio nuevo inicia con `destacado = false` si no se indica otro valor desde una operacion autorizada.

El propietario normal no puede cambiar este campo: `public.protect_negocio_system_fields()` bloquea cambios de `destacado` cuando el usuario no tiene rol `admin`.

El campo queda preparado para funcionalidades futuras como publicidad, perfiles destacados o suscripciones. Esas funcionalidades no estan implementadas en estas migraciones.

## 8. RLS de `public.negocios`

Implementado en:

```text
supabase/migrations/20260824044505_add_rls_to_negocios.sql
```

La migracion habilita RLS:

```sql
alter table public.negocios
enable row level security;
```

Policies reales:

| Policy | Operacion | Quien | Alcance |
| --- | --- | --- | --- |
| `negocios_select_authenticated` | `select` | `authenticated` | Permite consultar el directorio de negocios autenticado con `using (true)`. |
| `negocios_update_own` | `update` | `authenticated` propietario | Permite actualizar filas donde `id_propietario = auth.uid()` y exige lo mismo en `with check`. |
| `admin_update_all_negocios` | `update` | `authenticated` con rol `admin` | Permite actualizar cualquier negocio si `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'`. |
| `admin_delete_negocios` | `delete` | `authenticated` con rol `admin` | Permite eliminar negocios si el JWT tiene `app_role = 'admin'`. |

No se encontro policy de `insert` para `public.negocios`. La creacion se realiza mediante `public.crear_negocio(...)`.

Segun las policies actuales:

- Usuarios autenticados pueden leer negocios.
- El propietario puede actualizar sus propios negocios.
- El administrador puede actualizar y eliminar cualquier negocio.

## 9. Proteccion de campos sensibles

Implementado en:

```text
supabase/migrations/20260824044505_add_rls_to_negocios.sql
```

Funcion real:

```sql
public.protect_negocio_system_fields()
```

Trigger real:

```sql
protect_negocio_system_fields
```

Se ejecuta `before update on public.negocios`.

Campos protegidos:

| Campo | Proteccion |
| --- | --- |
| `id_negocio` | Nunca puede modificarse. |
| `id_propietario` | Un propietario normal no puede transferir el negocio a otra cuenta. |
| `destacado` | Un propietario normal no puede modificarlo; queda administrado por la plataforma. |

Como el trigger no bloquea otros campos, el propietario puede editar su propio negocio en campos como:

- `nombre`
- `tipo`
- `zona_id`
- `direccion`
- `latitud`
- `longitud`
- `telefono`
- `horario`

El administrador puede modificar `id_propietario` y `destacado`, pero `id_negocio` nunca puede cambiar. Las restricciones de tabla siguen aplicando, incluyendo los checks de latitud y longitud.

## 10. Consulta geoespacial

Implementada en:

```text
supabase/migrations/20260824044609_create_search_nearby_negocios_function+.sql
```

Funcion real:

```sql
public.buscar_negocios_cercanos(
    p_latitud double precision,
    p_longitud double precision,
    p_radio_km double precision,
    p_tipo public.tipo_negocio default null
)
```

Validaciones reales:

| Validacion | Regla |
| --- | --- |
| Usuario autenticado | Exige que `auth.uid()` no sea `null`. |
| Latitud | Debe estar entre `-90` y `90`. |
| Longitud | Debe estar entre `-180` y `180`. |
| Radio | `p_radio_km` no puede ser `null` y debe ser mayor que `0`. |

Datos devueltos:

| Campo | Descripcion |
| --- | --- |
| `id_negocio` | UUID del negocio. |
| `nombre` | Nombre del negocio. |
| `tipo` | Tipo del negocio. |
| `zona_id` | Zona asociada. |
| `direccion` | Direccion textual. |
| `latitud` | Latitud guardada. |
| `longitud` | Longitud guardada. |
| `telefono` | Telefono. |
| `horario` | Horario. |
| `destacado` | Marca de destacado. |
| `distancia_km` | Distancia calculada entre el punto recibido y el negocio. |

La busqueda solo considera negocios con `latitud` y `longitud` no nulas. Si `p_tipo` viene informado, filtra por ese tipo. Si `p_tipo` es `null`, no filtra por tipo.

Flujo:

```text
Frontend
    |
    v
latitud + longitud + radio
    |
    v
buscar_negocios_cercanos(...)
    |
    v
PostGIS
    |
    v
negocios dentro del radio
    |
    v
resultado con distancia
```

## 11. Uso de PostGIS

La implementacion usa funciones de PostGIS desde el schema `extensions`:

- `extensions.ST_MakePoint`
- `extensions.ST_SetSRID`
- `extensions.ST_DWithin`
- `extensions.ST_Distance`
- Cast a `extensions.geography`

Las coordenadas se construyen asi:

```text
longitud = X
latitud = Y
SRID = 4326
```

`ST_DWithin` filtra negocios dentro del radio. El radio se recibe en kilometros y se convierte a metros con `p_radio_km * 1000`.

`ST_Distance` calcula la distancia en metros sobre `geography`; la funcion divide entre `1000.0` para devolver `distancia_km`.

## 12. Indice geoespacial

Implementado en:

```text
supabase/migrations/20260824044609_create_search_nearby_negocios_function+.sql
```

Indice real:

```sql
negocios_ubicacion_gist_idx
```

Expresion indexada:

```sql
extensions.ST_SetSRID(
    extensions.ST_MakePoint(longitud::double precision, latitud::double precision),
    4326
)::extensions.geography
```

Es un indice `GiST` parcial:

```sql
where latitud is not null
  and longitud is not null
```

Este indice ayuda a PostgreSQL a encontrar negocios cercanos de forma mas eficiente cuando crezca la cantidad de registros con coordenadas.

## 13. Filtro por tipo

La busqueda acepta:

```sql
p_tipo public.tipo_negocio default null
```

Regla real:

```sql
p_tipo is null or n.tipo = p_tipo
```

Ejemplos conceptuales:

```text
p_tipo = 'veterinaria'
-> solo veterinarias

p_tipo = null
-> todos los negocios
```

Los valores posibles son los del enum `public.tipo_negocio`: `veterinaria`, `tienda` y `refugio`.

## 14. Calculo de distancia

La funcion devuelve `distancia_km`.

Internamente PostgreSQL calcula con:

```sql
extensions.ST_Distance(... geography ..., ... geography ...)
```

Ese resultado se divide entre `1000.0`, por lo que la distancia devuelta queda en kilometros.

## 15. Ordenamiento de resultados

El orden real de la consulta es:

```sql
order by
    n.destacado desc,
    distancia_km asc;
```

Esto significa:

1. Primero aparecen los negocios destacados.
2. Dentro de ese orden, aparecen los mas cercanos primero.

`destacado` ya existe y esta protegido, pero la logica completa de publicidad o suscripcion todavia no esta implementada.

## 16. Uso desde frontend

Ejemplo conceptual para crear un negocio:

```js
const { data, error } = await supabase.rpc('crear_negocio', {
  p_nombre: 'Veterinaria Central',
  p_tipo: 'veterinaria',
  p_zona_id: zonaId,
  p_direccion: 'San Jose',
  p_latitud: 9.9281,
  p_longitud: -84.0907,
  p_telefono: '2222-2222',
  p_horario: 'Lunes a sabado'
});
```

La respuesta `data` contiene el `id_negocio` creado si la operacion fue exitosa.

Ejemplo conceptual para buscar negocios cercanos:

```js
const { data, error } = await supabase.rpc('buscar_negocios_cercanos', {
  p_latitud: 9.9281,
  p_longitud: -84.0907,
  p_radio_km: 5,
  p_tipo: null
});
```

El frontend debe encargarse de obtener ubicacion del dispositivo, integrar mapas, renderizar formularios e interfaz visual. Esas partes no forman parte de estas migraciones.

## 17. Flujo completo

```text
Usuario se registra como negocio
        |
        v
auth.users
        |
        v
public.usuarios
tipo = negocio
        |
        v
completa informacion del establecimiento
        |
        v
crear_negocio()
        |
        v
public.negocios
        |
        v
RLS protege edicion
        |
        v
buscar_negocios_cercanos()
        |
        v
directorio / mapa
```

## 18. Migraciones relacionadas

| Migracion | Descripcion |
| --- | --- |
| `20260824044045_create_negocios_table.sql` | Crea el enum `public.tipo_negocio` y la tabla `public.negocios`. |
| `20260824044349_create_negocio_function.sql` | Crea la RPC `public.crear_negocio(...)` para crear negocios desde el usuario autenticado. |
| `20260824044505_add_rls_to_negocios.sql` | Habilita RLS, crea policies de lectura, actualizacion y eliminacion, y agrega `protect_negocio_system_fields()`. |
| `20260824044609_create_search_nearby_negocios_function+.sql` | Crea el indice `negocios_ubicacion_gist_idx` y la RPC `public.buscar_negocios_cercanos(...)`. |

## 19. Lo que NO esta implementado todavia

Este bloque no implementa:

- Resenas de negocios.
- Favoritos.
- Suscripciones.
- Pagos.
- Publicidad completa.
- Activacion automatica de `destacado`.
- Verificacion documental de negocios.

No existe una tabla `verificaciones` para negocios en las migraciones revisadas. La verificacion documental implementada actualmente pertenece al modulo de paseadores.

## 20. Estado actual

| Funcionalidad | Estado |
| --- | --- |
| Tabla `public.negocios` | Completado |
| Enum `public.tipo_negocio` | Completado |
| Relacion con propietario | Completado |
| Relacion con zonas | Completado |
| Creacion segura por RPC | Completado |
| RLS de `public.negocios` | Completado |
| Proteccion de campos sensibles | Completado |
| Campo `destacado` protegido | Completado |
| Busqueda geoespacial | Completado |
| Filtro por tipo | Completado |
| Calculo de distancia | Completado |
| Indice geoespacial | Completado |
| Resenas | Pendiente |
| Favoritos | Pendiente |
| Publicidad/suscripciones completas | Pendiente |
| Pagos | Pendiente |
| Verificacion documental de negocios | Pendiente |
