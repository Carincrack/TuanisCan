# Supabase, base de datos y administrador

Este documento resume los cambios ya implementados en el repositorio de TuanisCan relacionados con Supabase, las tablas `zonas` y `usuarios`, y la configuracion de la cuenta interna con rol `admin`.

Solo se documenta lo que existe actualmente en el repositorio.

## Archivos revisados

- `supabase/migrations/20260823212916_create_zonas_table.sql`
- `supabase/migrations/20260823215237_create_usuarios_table.sql`
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
```

Luego crea un cliente de Supabase con `SUPABASE_SECRET_KEY` y opciones de Auth orientadas a ejecucion administrativa:

- `autoRefreshToken: false`
- `persistSession: false`

El script busca en Supabase Auth el usuario cuyo correo coincida con `ADMIN_EMAIL`, ignorando diferencias entre mayusculas y minusculas. Para hacerlo, llama a `supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })` y busca el correo dentro de la lista recibida.

Si el usuario no existe, el script falla con un error. Si el usuario ya tiene `admin.app_metadata.app_role === 'admin'`, imprime un mensaje y termina sin actualizarlo.

Si el usuario existe y aun no tiene el rol, el script ejecuta:

```text
supabase.auth.admin.updateUserById(...)
```

para configurar:

```text
app_metadata.app_role = admin
```

El script conserva la metadata existente porque construye el nuevo `app_metadata` copiando primero `admin.app_metadata` y luego asignando `app_role: 'admin'`.

### Uso de `app_metadata`

`app_metadata` se usa para informacion de autorizacion administrada por la aplicacion o por procesos internos. A diferencia de metadata editable por el usuario, este espacio es apropiado para guardar un rol como `admin` cuando se configura desde un entorno controlado con una clave administrativa.

Segun la implementacion actual, esta cuenta administrativa no necesita obligatoriamente un registro en `public.usuarios`, porque su proposito es gestionar internamente la plataforma. El script solo actualiza Supabase Auth; no inserta ni modifica registros en `public.usuarios`.

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

## 10. Estado actual de la implementacion

Verificado en el repositorio:

- Configuracion local de Supabase inicializada en `supabase/config.toml`.
- Carpeta `supabase/.temp/` presente con archivos generados por la CLI, incluido `linked-project.json`.
- Migracion `20260823212916_create_zonas_table.sql` para crear `public.zonas`.
- Activacion de PostGIS en la migracion de `zonas`.
- Campo geoespacial `poligono_cobertura` con tipo `extensions.geometry(Polygon, 4326)`.
- Migracion `20260823215237_create_usuarios_table.sql` para crear `public.usuarios`.
- Enum `public.tipo_usuario` con valores `dueno`, `paseador`, `negocio` y `admin`.
- Relacion `public.usuarios.id_usuario` hacia `auth.users(id)` con `on delete cascade`.
- Relacion `public.usuarios.zona_id` hacia `public.zonas(id_zona)` con `on delete set null`.
- Script `scripts/configure-admin.mjs` para configurar `app_metadata.app_role = admin` en Supabase Auth.
- Variables requeridas documentadas en `.env.example`.
- `.env` ignorado en `.gitignore`.

No se encontro implementacion de RLS, politicas, login frontend conectado a Supabase, CRUD frontend conectado a Supabase, triggers, registro automatico de perfiles ni permisos administrativos adicionales en las migraciones o archivos revisados.
