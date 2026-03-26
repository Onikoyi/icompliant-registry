import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    const { user: adminUser, permissions } =
      await getCurrentUserWithPermissions()

    if (!permissions.includes('user.manage')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { email, password, role_id } = body

    if (!email || !password || !role_id) {
      return NextResponse.json(
        { error: 'All fields required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 1️⃣ Create Auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Auth creation failed' },
        { status: 400 }
      )
    }

    const authUserId = authData.user.id

    // 2️⃣ Insert into app users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUserId,
        email,
        role_id,
        must_reset_password: true,
      })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      )
    }

    // 3️⃣ Audit
    await logAudit({
      actor_user_id: adminUser.id,
      action: 'USER_CREATE',
      entity: 'users',
      entity_id: authUserId,
      metadata: {
        email,
        role_id,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}