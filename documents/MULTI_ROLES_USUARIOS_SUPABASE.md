# Multi Roles de Usuarios en Supabase

## Problema anterior

`public.usuarios.tipo_usuario` obligaba a que una cuenta tuviera un unico perfil funcional: `dueno`, `paseador` o `negocio`. Eso impedia que una misma persona tuviera mascotas, trabajara como paseador y administrara negocios usando la misma cuenta de Supabase Auth.

## Nuevo modelo

La migracion `20260827044234_multi_role_user_profiles.sql` normaliza los perfiles funcionales:

```text
public.usuarios
   |
   +-- public.usuario_roles
             |
             +-- public.roles
```

`public.roles` contiene solo:

- `dueno`
- `paseador`
- `negocio`

`admin` no existe en `public.roles`.

```text
                    USUARIO
                       |
            +----------+----------+
            |          |          |
            v          v          v
          DUENO     PASEADOR    NEGOCIO
            |          |          |
        mascotas   paseadores   negocios


ADMIN:

auth.users
   |
   +-- app_metadata.app_role = admin
   |
   +-- public.usuarios = identidad personal vinculada
```

## Tablas nuevas

`public.roles`

| Campo | Uso |
| --- | --- |
| `id_rol` | Identificador interno del rol funcional. |
| `nombre` | Nombre unico del rol: `dueno`, `paseador`, `negocio`. |

`public.usuario_roles`

| Campo | Uso |
| --- | --- |
| `id_usuario` | FK a `public.usuarios(id_usuario)`. |
| `id_rol` | FK a `public.roles(id_rol)`. |
| `fecha_asignacion` | Fecha de asignacion del rol. |

La clave primaria es `(id_usuario, id_rol)`, por lo que asignar el mismo rol dos veces es idempotente.

## Migracion de datos

La migracion copia los valores existentes de `usuarios.tipo_usuario` hacia `usuario_roles` cuando el valor es `dueno`, `paseador` o `negocio`.

Los registros con `tipo_usuario = 'admin'` no generan rol publico. La autorizacion administrativa sigue dependiendo de:

```sql
auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'
```

Despues de reemplazar las funciones dependientes, la migracion elimina `public.usuarios.tipo_usuario` y el enum `public.tipo_usuario`.

## RLS

`public.roles`:

- `authenticated` puede consultar el catalogo.
- No hay permisos directos de `insert`, `update` ni `delete` para usuarios normales.

`public.usuario_roles`:

- Cada usuario puede consultar sus propios roles.
- Admin puede consultar todos.
- No hay permisos directos de `insert`, `update` ni `delete` para usuarios normales.

Las asignaciones se hacen por funciones `security definer`.

## Registro

`public.handle_new_user()` sigue creando `public.usuarios`.

Compatibilidad temporal:

```json
{ "tipo_usuario": "paseador" }
```

Nuevo formato soportado:

```json
{ "roles": ["dueno", "paseador"] }
```

La funcion rechaza cualquier rol fuera de `dueno`, `paseador`, `negocio`; por tanto `admin` desde metadata publica no funciona.

Si el usuario recibe rol `paseador`, se asegura la fila en `public.paseadores`. Si el registro trae datos reales de negocio (`nombre_negocio`, `tipo_negocio`, etc.), se conserva la creacion existente del negocio inicial. La RPC para agregar rol `negocio` no crea negocios ficticios.

## Funciones nuevas

`public.usuario_tiene_rol(p_id_usuario uuid, p_rol text)`

Devuelve `true` si el usuario tiene el rol funcional indicado.

`public.agregar_rol_a_mi_cuenta(p_rol text)`

Usa `auth.uid()`, acepta solo `dueno`, `paseador`, `negocio`, es idempotente y crea el perfil en `public.paseadores` cuando el rol agregado es `paseador`.

`public.obtener_mis_roles()`

Devuelve un arreglo de texto con los roles del usuario autenticado.

`public.obtener_mi_perfil()`

Devuelve JSON con:

```json
{
  "usuario": {
    "id_usuario": "...",
    "nombre": "...",
    "telefono": "...",
    "foto_perfil": "...",
    "zona_id": "...",
    "fecha_registro": "...",
    "activo": true
  },
  "roles": ["dueno", "paseador", "negocio"],
  "is_admin": false
}
```

## Funciones modificadas

`public.handle_new_user()`

- Deja de insertar `usuarios.tipo_usuario`.
- Inserta roles en `public.usuario_roles`.
- Mantiene compatibilidad con `tipo_usuario`.
- Soporta `roles: [...]`.
- Rechaza `admin`.

`public.buscar_paseadores(...)`

- Ya no filtra `usuarios.tipo_usuario = 'paseador'`.
- Valida rol con `public.usuario_tiene_rol(u.id_usuario, 'paseador')`.
- Mantiene filtros de verificacion, disponibilidad, zona y calificacion.

`public.crear_negocio(...)`

- Ya no valida `usuarios.tipo_usuario = 'negocio'`.
- Exige usuario activo y rol funcional `negocio` en `usuario_roles`.

## Login y rol activo

Supabase Auth sigue manejando email, password, access token y refresh token.

Flujo:

```text
email/password
   |
   v
supabase.auth.signInWithPassword()
   |
   v
obtener_mi_perfil()
   |
   v
roles[] + is_admin
   |
   v
rol activo para UI
```

El frontend guarda el rol activo en `sessionStorage` solo como contexto de navegacion. PostgreSQL no confia en ese valor; las operaciones sensibles revisan `auth.uid()` y las tablas reales.

Si una cuenta tiene varios roles, el shell muestra un selector de perfil y permite cambiar entre `dueno`, `paseador`, `negocio` y, si aplica, `admin`, sin cerrar sesion.

## Admin separado

Admin continua fuera de `public.roles`.

Admin debe tener una fila en `public.usuarios` con el mismo UUID de `auth.users`. Esa fila no le da permisos administrativos; solo guarda la identidad personal visible, como nombre, telefono, foto y zona, para saber exactamente quien ingreso.

Un admin puede tener:

```json
{
  "is_admin": true,
  "roles": ["dueno", "paseador"]
}
```

Tambien puede tener:

```json
{
  "is_admin": true,
  "roles": []
}
```

Las policies y funciones administrativas existentes siguen usando `auth.jwt() -> 'app_metadata' ->> 'app_role' = 'admin'`.
