# TuanisCan

TuanisCan es una aplicación web para la gestión de servicios y perfiles relacionados con mascotas. Está desarrollada con React, TypeScript y Vite, y usa Supabase para autenticación, base de datos y almacenamiento de archivos.

Esta guía explica cómo preparar el entorno, conectar Supabase y ejecutar la aplicación en desarrollo o en una compilación local.

## Requisitos

- **Node.js 20.19 o posterior, o 22.12 o posterior.** Se recomienda una versión LTS compatible.
- **npm**, incluido con Node.js.
- Acceso a un proyecto de Supabase configurado para TuanisCan.
- Opcional: **Docker Desktop** y la Supabase CLI para ejecutar Supabase localmente.

Comprueba las versiones instaladas:

```bash
node --version
npm --version
```

Vite publica sus [requisitos de Node.js](https://vite.dev/guide/). Para usar Supabase local, consulta los [requisitos de desarrollo local](https://supabase.com/docs/guides/local-development).

## 1. Obtener el código e instalar dependencias

Clona el repositorio y cambia a la carpeta del proyecto. Sustituye `<URL-del-repositorio>` por la dirección Git del proyecto:

```bash
git clone <URL-del-repositorio>
cd TuanisCan
npm ci
```

`npm ci` instala las versiones fijadas en `package-lock.json`. Si estás trabajando en una copia descargada y no tienes el repositorio Git, abre una terminal en la carpeta que contiene `package.json` y ejecuta `npm install`.

## 2. Configurar Supabase

La aplicación requiere dos variables para conectarse a Supabase. En la raíz del proyecto, crea un archivo **`.env.local`**:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Reemplaza los valores entre `< >` con los del proyecto que usarás. En el panel de Supabase, busca la URL del proyecto y su clave publicable en **Project Settings → API Keys**. En proyectos antiguos puede aparecer una clave `anon`; también sirve para el cliente de esta aplicación.

Las variables `VITE_` quedan incluidas en el código que se descarga en el navegador. **Solo configura aquí la URL y una clave publicable/`anon`. Nunca pongas una clave `secret`, `service_role`, contraseñas ni tokens privados en una variable `VITE_`.** Los archivos `.env.local` y `.env` están excluidos del control de versiones.

### Usar un proyecto de Supabase remoto

Si ya existe un proyecto de desarrollo compartido, solicita al responsable del proyecto la URL y la clave publicable. Asegúrate de que el esquema de la base de datos y las políticas de Storage estén al día con las migraciones de `supabase/migrations`.

Si necesitas aplicar las migraciones a un proyecto remoto nuevo, instala las dependencias primero y ejecuta desde la raíz:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy limpiar-chats
```

El primer comando abre el proceso de autenticación de Supabase CLI. El `project-ref` es el identificador del proyecto, visible en su URL o en la configuración del panel. Revisa la salida de `db push --dry-run` antes de aplicar cambios. `db push` modifica el esquema del proyecto vinculado; confirma que corresponde al entorno correcto antes de ejecutarlo.

### Usar Supabase local (opcional)

La configuración del proyecto está en `supabase/config.toml` y las migraciones están en `supabase/migrations`. Para levantar la base de datos, Auth y Storage en tu computadora necesitas tener Docker Desktop instalado y en ejecución. La Supabase CLI ya está incluida como dependencia de desarrollo.

```bash
npx supabase start
npx supabase status
```

La primera ejecución puede tardar porque descarga las imágenes necesarias. Copia la URL local y la clave `anon` que muestra `supabase status` a `.env.local`, por ejemplo:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-local>
```

Reinicia el servidor de Vite después de cambiar `.env.local`. Las variables de entorno se leen al iniciar el proceso.

Para detener Supabase local sin borrar los datos, ejecuta:

```bash
npx supabase stop
```

Para borrar los datos locales y volver a crear la base aplicando todas las migraciones desde cero:

```bash
npx supabase db reset
```

**`db reset` elimina los datos de la base local.** No lo uses como forma de reiniciar un proyecto remoto.

## 3. Ejecutar la aplicación

Desde la carpeta que contiene `package.json`, inicia el servidor:

```bash
npm run dev
```

Abre en el navegador la dirección que indique la terminal; normalmente es `http://localhost:5173`. Deja la terminal abierta mientras usas la aplicación. Vite actualizará el navegador al guardar cambios.

Para terminar el servidor, vuelve a la terminal y presiona `Ctrl+C`.

### Recuperación de contraseña en desarrollo

El enlace de recuperación redirige a `/actualizar-contrasena`. Si Supabase rechaza el enlace, agrega la URL local completa a la lista de redirecciones permitidas de Auth en el panel del proyecto:

```text
http://localhost:5173/actualizar-contrasena
```

Si Vite eligió otro puerto, usa el puerto que aparece en la terminal.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Comprueba TypeScript y genera los archivos de producción en `dist/`. |
| `npm run preview` | Sirve localmente la última compilación de `dist/`. Ejecuta primero `npm run build`. |
| `npm run lint` | Analiza el código con ESLint. |
| `npm run seed` | Configura una cuenta administradora en el proyecto de Supabase indicado por las variables de entorno del script. |
| `npm run bones` | Genera capturas de esqueletos de carga con Boneyard y Playwright. |

Para `npm run bones`, inicia primero la aplicación con `npm run dev`. El comando usa por defecto `http://localhost:5173/esqueletos` y escribe los resultados en `src/bones/`. La primera ejecución puede descargar Chromium. Puedes rehacer todas las capturas con `npm run bones -- --force` o indicar otro origen con `npm run bones -- https://<dominio>`.

## Compilar y revisar la versión de producción

Genera la compilación:

```bash
npm run build
```

Los archivos listos para publicar quedan en `dist/`. Para abrir esa compilación en tu máquina:

```bash
npm run preview
```

Configura también `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el entorno de compilación de la plataforma donde publiques la aplicación. Si la plataforma permite editar el enrutamiento, configura una regla para que las rutas de la aplicación React se sirvan desde `index.html`. En el panel de Supabase, agrega el dominio publicado a las URL permitidas de Auth; incluye también la ruta `/actualizar-contrasena`.

## Crear o actualizar la cuenta administradora (opcional)

`npm run seed` ejecuta `scripts/configure-admin.mjs`. No es necesario para iniciar la aplicación. A diferencia de Vite, este script carga las variables privadas desde un archivo **`.env`** (o desde las variables de entorno de la terminal). Crea el archivo `.env` en la raíz para usar el comando y no lo incluyas en Git:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<secret-key>
ADMIN_EMAIL=<correo-del-administrador>
ADMIN_NOMBRE=<nombre-del-administrador>
TEST_USERS_PASSWORD=<contrasena-inicial>
```

Opcionalmente, acepta `ADMIN_TELEFONO`, `ADMIN_FOTO_PERFIL` y `ADMIN_ZONA_ID`. Este comando usa privilegios administrativos: crea la cuenta si no existe y, si existe, la actualiza para asignarle el rol administrador. Ejecuta el script solo contra el proyecto correcto. No publiques, compartas ni introduzcas la clave `SUPABASE_SECRET_KEY` en código del navegador o repositorios.

## Estructura principal

```text
src/                   Código de la aplicación React y TypeScript
  components/          Componentes de interfaz
  context/             Estado compartido, incluida la sesión
  lib/                 Cliente de Supabase y utilidades
  page/                Vistas de la aplicación
  services/            Operaciones de datos y servicios
supabase/
  functions/            Funciones Edge
  migrations/           Cambios versionados de base de datos y Storage
scripts/                Utilidades de desarrollo y configuración
public/                 Recursos estáticos
```

## Solución de problemas

### La aplicación indica que faltan variables de entorno

- Confirma que `.env.local` está en la misma carpeta que `package.json`.
- Revisa que los nombres estén escritos exactamente como `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Reinicia `npm run dev` después de editar el archivo.

### La aplicación no logra conectarse a Supabase

- Comprueba que la URL y la clave pertenecen al mismo proyecto.
- Verifica que el proyecto remoto está activo o que Supabase local sigue ejecutándose (`npx supabase status`).
- Confirma que las migraciones del proyecto incluyen el esquema y las políticas requeridas por la aplicación.

### `npm run dev` o la Supabase CLI falla al iniciar

- Comprueba `node --version`; Vite requiere Node.js 20.19+ o 22.12+.
- Ejecuta `npm ci` desde la raíz del proyecto si faltan dependencias.
- Si usas Supabase local, inicia Docker Desktop y luego vuelve a ejecutar `npx supabase start`.
- Si el puerto predeterminado de Vite ya está ocupado, Vite indicará otro puerto en la terminal.

### El enlace para cambiar la contraseña no vuelve a la aplicación

Agrega la URL local o publicada, incluida la ruta `/actualizar-contrasena`, a las URL de redirección permitidas en la configuración de Auth de Supabase.

## Tecnologías principales

- React 19 y TypeScript
- Vite 7
- Supabase
- Tailwind CSS
