import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function getCurrentUser() {
  // 🔥 TEMP: Replace with real auth later
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role_id')
    .eq('email', 'admin@nikosoft.com')
    .single()

  if (error || !data) {
    throw new Error('User not found')
  }

  return data
}

export async function hasPermission(
  roleId: string,
  permissionCode: string
) {
  const { data, error } = await supabaseAdmin
    .from('role_permissions')
    .select(`
      permission:permissions(code)
    `)
    .eq('role_id', roleId)

  if (error) {
    throw new Error(error.message)
  }

  return data?.some(
    (p: any) => p.permission.code === permissionCode
  )
}