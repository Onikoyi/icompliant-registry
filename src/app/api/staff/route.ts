import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // 🔐 FETCH CURRENT USER + PERMISSIONS
    const authRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    const authData = await authRes.json()
    console.log('AUTH RESPONSE:', authData)
    if (!authRes.ok || !authData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const permissions: string[] = authData.permissions || []
    console.log('PERMISSIONS:', permissions)
    // 🔐 RBAC CHECK
    if (!permissions.includes('staff.create')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    // ✅ CONTINUE WITH CREATION
    const body = await request.json()

    const {
      full_name,
      surname,
      other_names,
      staff_number,
      employment_type,
      role_title,
      employment_status
    } = body

    const ownerKey = `STF-${Date.now()}`

    // ✅ CREATE OWNER
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .insert([
        {
          owner_key: ownerKey,
          owner_type: 'staff',
          full_name,
          surname,
          other_names
        }
      ])
      .select()
      .single()

    if (ownerError) {
      return NextResponse.json(
        { error: ownerError.message },
        { status: 400 }
      )
    }

    // ✅ CREATE STAFF
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .insert([
        {
          owner_id: owner.id,
          staff_number,
          employment_type,
          role_title,
          employment_status
        }
      ])
      .select()
      .single()

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      owner,
      staff
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}