import { createServerClient } from '@/lib/supabase/server'

export async function getCurrentUserWithPermissions() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      permissions: [],
    }
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role_id')
    .eq('id', user.id)
    .single()

  if (!dbUser) {
    return {
      user: null,
      permissions: [],
    }
  }

  const { data: permissionsData } = await supabase
    .from('role_permissions')
    .select(`
      permissions ( code )
    `)
    .eq('role_id', dbUser.role_id)

  const permissions =
    permissionsData?.map((p: any) => p.permissions.code) || []

  return {
    user: dbUser,
    permissions,
  }

  if (role.name === 'super_admin') {
    const { data: allPermissions } = await admin
      .from('permissions')
      .select('code')
  
    return {
      user,
      permissions: allPermissions.map(p => p.code)
    }
  }
}