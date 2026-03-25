import { createAdminClient, createServerClient } from '@/lib/supabase/server'



export type AuthenticatedAppUser = {
  id: string
  email: string
  role_id: string
  role_name?: string
}

export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('users')
    .select(`
      id,
      email,
      role_id,
      roles:role_id (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (error || !data) {
    throw new Error('User not found in system')
  }

  return {
    id: data.id,
    email: data.email,
    role_id: data.role_id,
    role_name: Array.isArray(data.roles)
      ? data.roles[0]?.name
      : (data.roles as any)?.name,
  }
}

export async function getPermissionsForRole(roleId: string): Promise<string[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('role_permissions')
    .select(`
      permissions:permission_id (
        code
      )
    `)
    .eq('role_id', roleId)

  if (error) {
    throw new Error(error.message)
  }

  return (
    data
      ?.map((row: any) => row.permissions?.code)
      .filter(Boolean) ?? []
  )
}



export async function getCurrentUserWithPermissions() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const admin = createAdminClient()

  // Get user basic info
  const { data: appUser, error: userError } = await admin
    .from('users')
    .select('id, email, role_id')
    .eq('id', user.id)
    .single()

  if (userError || !appUser) {
    throw new Error('User not found in system')
  }

  // Get role explicitly (NO nested select ambiguity)
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id, name')
    .eq('id', appUser.role_id)
    .single()

  if (roleError || !role) {
    throw new Error('Role not found')
  }

  // 🔥 SUPER ADMIN OVERRIDE
  if (role.name?.trim().toLowerCase() === 'super_admin') {
  
    const { data: allPermissions } = await admin
      .from('permissions')
      .select('code')
  
    return {
      user: appUser,
      permissions: allPermissions?.map(p => p.code) || [],
    }
  }

  // Normal role permissions
  const { data: rolePermissions } = await admin
    .from('role_permissions')
    .select(`
      permissions (
        code
      )
    `)
    .eq('role_id', appUser.role_id)

  const permissions =
    rolePermissions?.map((rp: any) => rp.permissions.code) || []

  return {
    user: appUser,
    permissions,
  }
}

export async function requirePermission(permissionCode: string) {
  const { user, permissions } = await getCurrentUserWithPermissions()

  if (!permissions.includes(permissionCode)) {
    throw new Error(`Forbidden:${permissionCode}`)
  }

  return { user, permissions }
}

export async function hasPermission(
  roleId: string,
  permissionCode: string
): Promise<boolean> {
  const permissions = await getPermissionsForRole(roleId)
  return permissions.includes(permissionCode)
}