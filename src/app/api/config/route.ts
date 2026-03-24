import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function checkPermission(required: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`)
  const data = await res.json()

  const permissions: string[] = data.permissions || []

  return permissions.includes(required)
}

export async function GET() {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const allowed = await checkPermission('config.manage')

  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { category, code, label } = body

    if (!category || !code || !label) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('system_config')
      .insert([{ category, code, label }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const allowed = await checkPermission('config.manage')

  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions' },
      { status: 403 }
    )
  }

  try {
    const { id } = await request.json()

    const { error } = await supabase
      .from('system_config')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}