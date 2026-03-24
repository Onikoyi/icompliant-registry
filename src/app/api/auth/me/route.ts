import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerClient()

    // 🔐 Get logged-in user from Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 🔍 Get user record from your DB
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { error: 'User not found in system' },
        { status: 404 }
      )
    }

    // 🔍 Get permissions
    const { data: permissionsData } = await supabase
      .from('role_permissions')
      .select(`
        permissions ( code )
      `)
      .eq('role_id', dbUser.role_id)

    const permissions =
      permissionsData?.map((p: any) => p.permissions.code) || []

    return NextResponse.json({
      user: dbUser,
      permissions,
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}