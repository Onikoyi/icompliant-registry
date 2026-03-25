import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await context.params

    if (!roleId) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      )
    }

    const { permissions } = await getCurrentUserWithPermissions()

    if (!permissions.includes('role.manage')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { permissionIds } = await req.json()

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'permissionIds must be an array' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { data: role, error: roleError } = await admin
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single()

      if (role.name?.trim().toLowerCase() === 'super_admin') {
        return NextResponse.json(
          { error: 'Super Admin permissions cannot be modified' },
          { status: 400 }
        )
      }

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await admin
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    if (permissionIds.length > 0) {
      const inserts = permissionIds.map((pid: string) => ({
        role_id: roleId,
        permission_id: pid,
      }))

      const { error: insertError } = await admin
        .from('role_permissions')
        .insert(inserts)

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}