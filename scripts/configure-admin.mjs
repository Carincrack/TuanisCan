import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL
const adminNombre = process.env.ADMIN_NOMBRE?.trim()
const adminTelefono = process.env.ADMIN_TELEFONO?.trim()
const adminFotoPerfil = process.env.ADMIN_FOTO_PERFIL?.trim()
const adminZonaId = process.env.ADMIN_ZONA_ID?.trim()
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

if (!supabaseUrl) {
  throw new Error('Falta SUPABASE_URL')
}

if (!supabaseSecretKey) {
  throw new Error('Falta SUPABASE_SECRET_KEY')
}

if (!adminEmail) {
  throw new Error('Falta ADMIN_EMAIL')
}

if (adminZonaId && !uuidPattern.test(adminZonaId)) {
  throw new Error(
    'ADMIN_ZONA_ID debe ser un UUID valido de public.zonas.id_zona. Dejalo vacio si no quieres ligar una zona.',
  )
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

async function configureAdmin() {
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    throw listError
  }

  const admin = users.find(
    (user) =>
      user.email?.toLowerCase() === adminEmail.toLowerCase(),
  )

  if (!admin) {
    throw new Error(
      `No existe ningún usuario con el correo ${adminEmail}`,
    )
  }

  let configuredAdmin = admin

  if (admin.app_metadata?.app_role === 'admin') {
    console.log(`${adminEmail} ya tiene el rol admin.`)
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(
      admin.id,
      {
        app_metadata: {
          ...admin.app_metadata,
          app_role: 'admin',
        },
      },
    )

    if (error) {
      throw error
    }

    configuredAdmin = data.user
  }

  const { data: profile, error: profileReadError } = await supabase
    .from('perfil_usuario')
    .select('id_usuario, nombre')
    .eq('id_usuario', configuredAdmin.id)
    .maybeSingle()

  if (profileReadError) {
    throw profileReadError
  }

  const nombre = adminNombre || profile?.nombre?.trim()

  if (!nombre) {
    throw new Error(
      'Falta ADMIN_NOMBRE para ligar informacion personal al administrador',
    )
  }

  const adminAccount = {
    id_usuario: configuredAdmin.id,
    correo: configuredAdmin.email,
    activo: true,
  }

  const { error: accountWriteError } = await supabase
    .from('usuarios')
    .upsert(adminAccount, { onConflict: 'id_usuario' })

  if (accountWriteError) {
    throw accountWriteError
  }

  const adminProfile = {
    id_usuario: configuredAdmin.id,
    nombre,
    ...(adminTelefono !== undefined && { telefono: adminTelefono || null }),
    ...(adminFotoPerfil !== undefined && {
      foto_perfil: adminFotoPerfil || null,
    }),
    ...(adminZonaId !== undefined && { zona_id: adminZonaId || null }),
  }

  const { error: profileWriteError } = await supabase
    .from('perfil_usuario')
    .upsert(adminProfile, { onConflict: 'id_usuario' })

  if (profileWriteError) {
    throw profileWriteError
  }

  console.log('Administrador configurado correctamente.')
  console.log(`Usuario: ${configuredAdmin.email}`)
  console.log(`ID: ${configuredAdmin.id}`)
  console.log(`Nombre: ${nombre}`)
  console.log(
    `Rol: ${configuredAdmin.app_metadata.app_role}`,
  )
}

configureAdmin().catch((error) => {
  console.error('No se pudo configurar el administrador.')
  console.error(error)
  process.exit(1)
})
