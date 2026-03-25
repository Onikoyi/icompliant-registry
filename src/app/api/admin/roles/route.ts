import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

export async function GET() {
  try {
    const { permissions } = await getCurrentUserWithPermissions()

    if (!permissions.includes('role.manage')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()

    const [rolesRes, permissionsRes, rolePermRes] = await Promise.all([
      admin.from('roles').select('*').order('name'),
      admin.from('permissions').select('*').order('code'),
      admin.from('role_permissions').select('*'),
    ])

    return NextResponse.json({
      roles: rolesRes.data || [],
      permissions: permissionsRes.data || [],
      rolePermissions: rolePermRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
    try {
      const { permissions } = await getCurrentUserWithPermissions()
  
      // 🔐 Only Super Admin or role.manage users
      if (!permissions.includes('role.manage')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
  
      const { name, description } = await req.json()
  
      if (!name) {
        return NextResponse.json(
          { error: 'Role name is required' },
          { status: 400 }
        )
      }
  
      const admin = createAdminClient()
  
      // ❗ Prevent duplicate roles
      const { data: existing } = await admin
        .from('roles')
        .select('id')
        .eq('name', name)
        .single()
  
      if (existing) {
        return NextResponse.json(
          { error: 'Role already exists' },
          { status: 400 }
        )
      }
  
      const { data, error } = await admin
        .from('roles')
        .insert({
          name,
          description: description || null,
        })
        .select()
        .single()
  
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
  
      return NextResponse.json(data)
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      )
    }
  }