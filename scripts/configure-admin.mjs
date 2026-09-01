import 'dotenv/config'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL?.trim()
const adminNombre = process.env.ADMIN_NOMBRE?.trim()
const adminTelefono = process.env.ADMIN_TELEFONO?.trim()
const adminFotoPerfil = process.env.ADMIN_FOTO_PERFIL?.trim()
const adminZonaId = process.env.ADMIN_ZONA_ID?.trim()
const adminPassword = process.env.TEST_USERS_PASSWORD

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

if (!supabaseUrl) throw new Error('Falta SUPABASE_URL')
if (!supabaseSecretKey) throw new Error('Falta SUPABASE_SECRET_KEY')
if (!adminEmail) throw new Error('Falta ADMIN_EMAIL')
if (!adminNombre) throw new Error('Falta ADMIN_NOMBRE')
if (!adminPassword) throw new Error('Falta TEST_USERS_PASSWORD')

if (adminZonaId && !uuidPattern.test(adminZonaId)) {
  throw new Error(
    'ADMIN_ZONA_ID debe ser un UUID valido de public.zonas.id_zona.',
  )
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function findUserByEmail(email) {
  const perPage = 1000

  for (let page = 1; ; page += 1) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page, perPage })

    if (error) throw error

    const user = users.find(
      (item) => item.email?.toLowerCase() === email.toLowerCase(),
    )

    if (user || users.length < perPage) return user ?? null
  }
}

function adminUserMetadata(current = {}) {
  return {
    ...current,
    nombre: adminNombre,
    roles: ['admin'],
    ...(adminTelefono !== undefined && { telefono: adminTelefono || null }),
    ...(adminFotoPerfil !== undefined && {
      foto_perfil: adminFotoPerfil || null,
    }),
    ...(adminZonaId !== undefined && { zona_id: adminZonaId || null }),
  }
}

async function upsertAdminProfile(user) {
  const { error: accountError } = await supabase.from('usuarios').upsert(
    {
      id_usuario: user.id,
      correo: user.email,
      activo: true,
    },
    { onConflict: 'id_usuario' },
  )

  if (accountError) throw accountError

  const { error: profileError } = await supabase.from('perfil_usuario').upsert(
    {
      id_usuario: user.id,
      nombre: adminNombre,
      ...(adminTelefono !== undefined && {
        telefono: adminTelefono || null,
      }),
      ...(adminFotoPerfil !== undefined && {
        foto_perfil: adminFotoPerfil || null,
      }),
      ...(adminZonaId !== undefined && { zona_id: adminZonaId || null }),
    },
    { onConflict: 'id_usuario' },
  )

  if (profileError) throw profileError
}

async function configureAdmin() {
  const existingUser = await findUserByEmail(adminEmail)
  let admin = existingUser

  if (!admin) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: adminUserMetadata(),
      app_metadata: {
        app_role: 'admin',
      },
    })

    if (error) throw error
    admin = data.user
  }

  // Mantiene Auth como fuente del privilegio administrativo.
  const { data, error } = await supabase.auth.admin.updateUserById(admin.id, {
    email_confirm: true,
    user_metadata: adminUserMetadata(admin.user_metadata),
    app_metadata: {
      ...admin.app_metadata,
      app_role: 'admin',
    },
  })

  if (error) throw error

  const configuredAdmin = data.user
  await upsertAdminProfile(configuredAdmin)

  console.log('')
  console.log('Administrador configurado correctamente')
  console.log(`Correo: ${configuredAdmin.email}`)
  console.log(`ID: ${configuredAdmin.id}`)
  console.log(`Nombre: ${adminNombre}`)
  console.log("user_metadata.roles: ['admin']")
  console.log(
    `app_metadata.app_role: ${configuredAdmin.app_metadata?.app_role}`,
  )
}

configureAdmin().catch((error) => {
  console.error('')
  console.error('No se pudo configurar el administrador.')
  console.error(error)
  process.exit(1)
})
