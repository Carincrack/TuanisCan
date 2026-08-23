import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL

if (!supabaseUrl) {
  throw new Error('Falta SUPABASE_URL')
}

if (!supabaseSecretKey) {
  throw new Error('Falta SUPABASE_SECRET_KEY')
}

if (!adminEmail) {
  throw new Error('Falta ADMIN_EMAIL')
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

  if (admin.app_metadata?.app_role === 'admin') {
    console.log(`${adminEmail} ya tiene el rol admin.`)
    return
  }

  const { data, error } =
    await supabase.auth.admin.updateUserById(
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

  console.log('Administrador configurado correctamente.')
  console.log(`Usuario: ${data.user.email}`)
  console.log(`ID: ${data.user.id}`)
  console.log(
    `Rol: ${data.user.app_metadata.app_role}`,
  )
}

configureAdmin().catch((error) => {
  console.error('No se pudo configurar el administrador.')
  console.error(error)
  process.exit(1)
})