# Supabase, base de datos y administrador

Este documento resume los cambios ya implementados en el repositorio de TuanisCan relacionados con Supabase, las tablas `zonas` y `usuarios`, y la configuracion de la cuenta interna con rol `admin`.

Solo se documenta lo que existe actualmente en el repositorio.

## Archivos revisados

- `supabase/migrations/20260823212916_create_zonas_table.sql`
- `supabase/migrations/20260823215237_create_usuarios_table.sql`
- `supabase/migrations/20260824034121_create_user_registration_trigger.sql`
- `supabase/migrations/20260824035015_add_rls_to_usuarios.sql`
- `supabase/migrations/20260824035102_add_rls_to_usuarios.sql`
- `supabase/config.toml`
- `supabase/.gitignore`
- `supabase/.temp/`
- `scripts/configure-admin.mjs`
- `.env.example`
- `.gitignore`
- `package.json`

## 1. Integracion con Supabase

El proyecto usa Supabase como plataforma para:

- PostgreSQL, mediante migraciones SQL ubicadas en `supabase/migrations/`.
- Supabase Auth, usado para administrar cuentas y credenciales.
- Gestion del esquema de base de datos mediante el flujo de migraciones de Supabase.

En `package.json` existe la dependencia `@supabase/supabase-js`, usada por el script administrativo `scripts/configure-admin.mjs` para conectarse a Supabase.

El archivo `supabase/config.toml` muestra una configuracion local de Supabase inicializada para el proyecto `TuanisCan`, con API, base de datos local, Auth, Storage, Realtime y Studio habilitados para el entorno local. La carpeta `supabase/.temp/` existe y contiene archivos generados por la CLI, incluido `linked-project.json`, lo que indica que la configuracion local tiene informacion de enlace con un proyecto remoto.

### `git push` vs `npx supabase db push`

`git push` y `npx supabase db push` no hacen lo mismo:

```text
git push
```

Sube los archivos versionados del repositorio a GitHub u otro remoto Git. Esto conserva el historial de cambios del codigo, incluyendo las migraciones SQL.

```text
npx supabase db push
```

Aplica al proyecto remoto de Supabase las migraciones pendientes que estan en `supabase/migrations/`.

En resumen: `git push` versiona los archivos; `npx supabase db push` modifica el esquema de la base de datos remota.

## 2. Tabla `zonas`

La tabla `public.zonas` esta definida en:

```text
supabase/migrations/20260823212916_create_zonas_table.sql
```

La migracion activa PostGIS antes de crear la tabla:

```sql
create extension if not exists postgis with schema extensions;
```

Esto habilita tipos y funciones geoespaciales en PostgreSQL.

### Esquema

| Campo | Tipo PostgreSQL | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_zona` | `uuid` | `primary key`, `default gen_random_uuid()` | Identificador unico de la zona. |
| `nombre` | `varchar(100)` | `not null` | Nombre de la zona. |
| `canton` | `varchar(100)` | `not null` | Canton al que pertenece la zona. |
| `provincia` | `varchar(100)` | `not null` | Provincia correspondiente. |
| `poligono_cobertura` | `extensions.geometry(Polygon, 4326)` | Sin restriccion `not null` en la migracion | Poligono geoespacial que representa la cobertura de la zona. |

### Campo `id_zona`

`id_zona` es un UUID usado como clave primaria. La migracion define `default gen_random_uuid()`, por lo que PostgreSQL puede generar el identificador automaticamente al insertar una zona si no se proporciona uno.

### Campos `nombre`, `canton` y `provincia`

Estos campos guardan la informacion textual basica de la zona. Los tres son obligatorios porque tienen la restriccion `not null`.

### Campo `poligono_cobertura`

`poligono_cobertura` usa PostGIS mediante el tipo:

```sql
extensions.geometry(Polygon, 4326)
```

`Polygon` indica que el valor geoespacial debe representar un poligono, es decir, un area cerrada. En este caso, sirve para modelar la cobertura geografica de una zona.

El SRID `4326` corresponde al sistema de coordenadas WGS 84, usado comunmente para coordenadas de latitud y longitud. Gracias a esto, la aplicacion puede representar areas geograficas reales, no solo texto como "San Jose" o "Cartago".

### Catalogo flexible

El catalogo puede precargarse mediante migraciones y tambien puede crecer desde la pantalla administrativa. El formulario exige zona, canton y provincia, y valida duplicados por canton y provincia antes de insertar. La tabla conserva `poligono_cobertura` opcional, tal como fue definida originalmente, para agregar informacion geoespacial cuando exista sin bloquear el registro de una zona nueva.

La ubicacion seleccionada por el usuario siempre se guarda mediante `zona_id`, nunca como texto libre. Si un lugar no aparece, administracion puede agregarlo; si una zona se elimina mientras esta en uso, las claves foraneas existentes la protegen o dejan la referencia en `null` segun la tabla relacionada.

## 3. Tabla `usuarios`

La tabla `public.usuarios` esta definida en:

```text
supabase/migrations/20260823215237_create_usuarios_table.sql
```

La migracion tambien crea el enum `public.tipo_usuario`, documentado en la siguiente seccion.

### Esquema

| Campo | Tipo | Restricciones | Descripcion |
| --- | --- | --- | --- |
| `id_usuario` | `uuid` | `primary key`, `references auth.users(id)`, `on delete cascade` | Identificador del perfil de dominio. Referencia al UUID del usuario en Supabase Auth. |
| `nombre` | `varchar(150)` | `not null` | Nombre del usuario dentro del dominio de TuanisCan. |
| `telefono` | `varchar(20)` | Sin restriccion `not null` | Telefono del usuario. |
| `tipo_usuario` | `public.tipo_usuario` | `not null` | Tipo controlado de usuario dentro del modelo actual. |
| `foto_perfil` | `text` | Sin restriccion `not null` | URL, ruta o texto asociado a la foto de perfil, segun lo que inserte la aplicacion. |
| `fecha_registro` | `timestamptz` | `not null`, `default now()` | Fecha y hora de registro del perfil. |
| `activo` | `boolean` | `not null`, `default true` | Indica si el perfil esta activo. |
| `zona_id` | `uuid` | `references public.zonas(id_zona)`, `on delete set null` | Zona asociada al usuario. Si la zona se elimina, este campo queda en `null`. |

### Relacion con `auth.users`

La columna:

```text
public.usuarios.id_usuario
```

referencia:

```text
auth.users.id
```

Esto significa que Supabase Auth administra la cuenta base y genera el UUID del usuario. `public.usuarios` usa ese mismo UUID para guardar informacion propia del dominio de TuanisCan.

La contrasena no se almacena en `public.usuarios`. Las credenciales, incluyendo correo y contrasena, son responsabilidad de Supabase Auth.

La migracion define:

```sql
on delete cascade
```

Por lo tanto, si se elimina el usuario correspondiente en `auth.users`, tambien se elimina su registro asociado en `public.usuarios`.

## 4. Enum de tipos de usuario

La migracion `20260823215237_create_usuarios_table.sql` define el enum:

```sql
public.tipo_usuario
```

Valores reales encontrados:

- `dueno`
- `paseador`
- `negocio`
- `admin`

Se usa un enum porque estos tipos forman un conjunto controlado dentro del modelo actual. Esto evita guardar valores arbitrarios en `usuarios.tipo_usuario`.

## 5. Relacion entre Supabase Auth y `usuarios`

```text
Supabase Auth
auth.users
      |
      | 1 : 1
      v
public.usuarios
```

`auth.users` pertenece al sistema de autenticacion de Supabase. Ahi viven la cuenta, el correo y las credenciales administradas por Auth.

`public.usuarios` almacena informacion propia del dominio de TuanisCan, como nombre, telefono, tipo de usuario, foto de perfil, estado activo y zona asociada.

## 6. Administrador de la plataforma

El archivo:

```text
scripts/configure-admin.mjs
```

implementa el mecanismo actual para configurar una cuenta interna de gestion de la plataforma con rol `admin`.

El script lee estas variables de entorno:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_NOMBRE=
ADMIN_TELEFONO=
ADMIN_FOTO_PERFIL=
ADMIN_ZONA_ID=
```

Luego crea un cliente de Supabase con `SUPABASE_SECRET_KEY` y opciones de Auth orientadas a ejecucion administrativa:

- `autoRefreshToken: false`
- `persistSession: false`

El script busca en Supabase Auth el usuario cuyo correo coincida con `ADMIN_EMAIL`, ignorando diferencias entre mayusculas y minusculas. Para hacerlo, llama a `supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })` y busca el correo dentro de la lista recibida.

Si el usuario no existe, el script falla con un error. Si el usuario ya tiene `admin.app_metadata.app_role === 'admin'`, imprime un mensaje y conserva el rol; aun asi continua con la verificacion del perfil personal asociado.

Si el usuario existe y aun no tiene el rol, el script ejecuta:

```text
supabase.auth.admin.updateUserById(...)
```

para configurar:

```text
app_metadata.app_role = admin
```

El script conserva la metadata existente porque construye el nuevo `app_metadata` copiando primero `admin.app_metadata` y luego asignando `app_role: 'admin'`.

Despues asegura que exista una fila en `public.usuarios` con el mismo UUID de Supabase Auth. Ese perfil guarda la informacion personal necesaria para identificar quien ingreso como administrador:

- `ADMIN_NOMBRE` se guarda en `public.usuarios.nombre`.
- `ADMIN_TELEFONO` se guarda en `public.usuarios.telefono` si se define.
- `ADMIN_FOTO_PERFIL` se guarda en `public.usuarios.foto_perfil` si se define.
- `ADMIN_ZONA_ID` se guarda en `public.usuarios.zona_id` si se define.

Si no existe una fila previa en `public.usuarios`, `ADMIN_NOMBRE` es obligatorio. Si la fila ya existe, el script puede reutilizar el nombre guardado.

### Uso de `app_metadata`

`app_metadata` se usa para informacion de autorizacion administrada por la aplicacion o por procesos internos. A diferencia de metadata editable por el usuario, este espacio es apropiado para guardar un rol como `admin` cuando se configura desde un entorno controlado con una clave administrativa.

La cuenta administrativa debe tener registro en `public.usuarios`. El rol admin sigue viviendo en `auth.users.app_metadata.app_role`, pero la identidad visible de la persona que ingresa queda ligada por `public.usuarios.id_usuario = auth.users.id`.

## 7. Seguridad del script administrativo

La configuracion actual separa secretos de archivos versionados:

- `.env` esta ignorado en `.gitignore`.
- `.env.local` y `.env.*.local` tambien estan ignorados.
- `supabase/.gitignore` ignora `supabase/.temp`, `.env.keys`, `.env.local` y `.env.*.local`.
- `.env.example` solo documenta los nombres de variables requeridas.
- La Secret Key de Supabase no debe almacenarse en Git.
- La Secret Key nunca debe usarse desde codigo frontend.
- `scripts/configure-admin.mjs` debe ejecutarse manualmente desde un entorno controlado.

Variables documentadas en `.env.example`:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_NOMBRE=
ADMIN_TELEFONO=
ADMIN_FOTO_PERFIL=
ADMIN_ZONA_ID=
```

No se deben escribir valores reales de llaves, contrasenas, tokens ni secretos en este documento ni en archivos versionados.

## 8. Ejecucion del script administrativo

Comando real:

```bash
node scripts/configure-admin.mjs
```

Flujo:

```text
lee variables de entorno
        |
        v
se conecta con Supabase usando una clave administrativa
        |
        v
busca ADMIN_EMAIL en Supabase Auth
        |
        v
obtiene su UUID
        |
        v
actualiza app_metadata
        |
        v
app_role = admin
        |
        v
crea o actualiza public.usuarios con su informacion personal
```

Si la configuracion se completa, el script imprime el correo, el ID y el rol del usuario actualizado. Si falta una variable de entorno, si el usuario no existe o si Supabase devuelve un error, el script termina con codigo de error.

## 9. Flujo de migraciones utilizado por el equipo

El flujo documentado para cambios de estructura de base de datos es:

```text
Crear migracion
      |
      v
supabase/migrations/
      |
      v
git commit
      |
      v
git push
      |
      v
npx supabase db push
      |
      v
Supabase remoto
```

Los cambios de estructura deben quedar versionados como migraciones SQL dentro de `supabase/migrations/`. Despues de versionarlos con Git, `npx supabase db push` aplica esas migraciones pendientes al proyecto remoto de Supabase.

## 10. Cambios recientes en registro y seguridad de usuarios

Las migraciones recientes agregan el registro automatico de perfiles en `public.usuarios`, RLS sobre la tabla y protecciones adicionales para campos sensibles.

### Registro automatico de usuarios

Implementado en:

```text
supabase/migrations/20260824034121_create_user_registration_trigger.sql
```

Flujo implementado:

```text
signUp()
    |
    v
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
```

La funcion `public.handle_new_user()` se ejecuta con `security definer` despues de un `insert` en `auth.users`. Lee estos campos reales desde `new.raw_user_meta_data`:

| Metadata | Uso en `public.usuarios` | Regla real |
| --- | --- | --- |
| `nombre` | `nombre` | Obligatorio; se aplica `trim()`. |
| `telefono` | `telefono` | Opcional; cadena vacia se guarda como `null`. |
| `tipo_usuario` | `tipo_usuario` | Obligatorio; solo permite `dueno`, `paseador` o `negocio`. |
| `foto_perfil` | `foto_perfil` | Opcional; cadena vacia se guarda como `null`. |
| `zona_id` | `zona_id` | Opcional; si viene informado se convierte a `uuid`. |

La insercion reutiliza `new.id`, el UUID generado por Supabase Auth, como `public.usuarios.id_usuario`. La contrasena permanece exclusivamente en Supabase Auth y no se guarda en `public.usuarios`.

El registro publico no puede crear usuarios `admin`: `handle_new_user()` rechaza cualquier `tipo_usuario` distinto de `dueno`, `paseador` o `negocio`.

### RLS de `public.usuarios`

Implementado en:

```text
supabase/migrations/20260824035015_add_rls_to_usuarios.sql
```

La migracion habilita Row Level Security:

```sql
alter table public.usuarios
enable row level security;
```

Policies reales encontradas:

| Policy | Operacion | Quien | Alcance |
| --- | --- | --- | --- |
| `usuarios_select_own` | `select` | `authenticated` | Permite leer solo la fila donde `(select auth.uid()) = id_usuario`. |
| `admin_select_all_usuarios` | `select` | `authenticated` con rol interno `admin` | Permite leer todas las filas cuando `(select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'`. |
| `usuarios_update_own` | `update` | `authenticated` | Permite actualizar solo la fila propia y exige que la fila resultante siga teniendo `id_usuario = auth.uid()`. |
| `admin_update_all_usuarios` | `update` | `authenticated` con rol interno `admin` | Permite actualizar cualquier fila cuando `app_metadata.app_role = 'admin'`; el `with check` exige la misma condicion. |

No se encontraron policies de `insert` ni `delete` para `public.usuarios`.

### Permisos actuales por tipo de usuario

Un usuario autenticado normal puede:

- Consultar su propio perfil.
- Actualizar su propia fila.

Un usuario autenticado normal no puede consultar perfiles ajenos ni actualizar filas ajenas por las policies actuales.

Un administrador se detecta desde el JWT con:

```sql
(select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin'
```

La autorizacion administrativa usa `app_metadata`, configurado desde un proceso interno, no metadata editable por el usuario.

### Proteccion de campos sensibles

Implementado en:

```text
supabase/migrations/20260824035015_add_rls_to_usuarios.sql
```

La funcion `public.protect_usuario_system_fields()` y el trigger `protect_usuario_system_fields` se ejecutan `before update on public.usuarios`.

Campos protegidos segun el SQL:

| Campo | Restriccion |
| --- | --- |
| `id_usuario` | Nadie puede modificarlo. |
| `fecha_registro` | Nadie puede modificarlo. |
| `tipo_usuario` | No puede cambiarse a `admin`. Usuarios normales no pueden modificarlo. |
| `activo` | Usuarios normales no pueden modificarlo. |

El administrador puede modificar `tipo_usuario` y `activo`, excepto que `tipo_usuario` nunca puede quedar como `admin`. El rol `admin` vive en `auth.users.app_metadata.app_role`, no como tipo de perfil publico.

RLS controla que filas puede leer o actualizar cada usuario. El trigger agrega una segunda capa sobre las columnas sensibles durante cualquier `update` permitido por RLS.

### INSERT y DELETE

El cliente no hace `insert` directo en `public.usuarios` con las policies actuales. La creacion del perfil ocurre automaticamente mediante `public.handle_new_user()` despues del registro en `auth.users`.

`delete` directo sobre `public.usuarios` no esta habilitado por las policies actuales.

La migracion `supabase/migrations/20260824035102_add_rls_to_usuarios.sql` existe en el repositorio, pero no contiene SQL.

## 11. Estado actual de la implementacion

Cambios recientes verificados en el repositorio:

- Registro automatico de usuarios mediante `public.handle_new_user()`.
- Trigger `on_auth_user_created` desde `auth.users` hacia `public.usuarios`.
- Restriccion de registro publico como `admin`.
- RLS habilitado en `public.usuarios`.
- Policies de lectura y actualizacion para usuario propio y administrador.
- Proteccion de campos sensibles mediante `public.protect_usuario_system_fields()` y trigger `protect_usuario_system_fields`.

No se encontro implementacion de RLS de mascotas, recuperacion de contrasena ni cambio de contrasena frontend en los archivos revisados.
