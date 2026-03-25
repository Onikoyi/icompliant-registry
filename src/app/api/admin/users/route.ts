import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function canManageUsers(permissions: string[]) {
  return (
    permissions.includes('user.manage') ||
    permissions.includes('role.assign')
  )
}

export async function GET() {
  try {
    const { permissions } = await getCurrentUserWithPermissions()

    if (!canManageUsers(permissions)) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()

    const [{ data: users, error: usersError }, { data: roles, error: rolesError }] =
      await Promise.all([
        admin
          .from('users')
          .select(`
            id,
            email,
            role_id,
            created_at,
            roles:role_id (
              id,
              name,
              description
            )
          `)
          .order('created_at', { ascending: false }),
        admin
          .from('roles')
          .select('id, name, description, created_at')
          .order('name', { ascending: true }),
      ])

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 })
    }

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 400 })
    }

    return NextResponse.json({
      users: users || [],
      roles: roles || [],
    })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, permissions } = await getCurrentUserWithPermissions()

    if (!permissions.includes('role.assign')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()
    const body = await request.json()
    const { userId, roleId } = body

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'userId and roleId are required' },
        { status: 400 }
      )
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    const { data: targetRole, error: roleError } = await admin
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .single()

    if (roleError || !targetRole) {
      return NextResponse.json(
        { error: 'Selected role does not exist' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: existingUserError } = await admin
      .from('users')
      .select('id, email, role_id')
      .eq('id', userId)
      .single()

    if (existingUserError || !existingUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    const oldRoleId = existingUser.role_id

    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({ role_id: roleId })
      .eq('id', userId)
      .select('id, email, role_id')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'user.role.assign',
      entity_type: 'users',
      entity_id: userId,
      metadata: {
        previous_role_id: oldRoleId,
        new_role_id: roleId,
        new_role_name: targetRole.name,
        target_email: existingUser.email,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}