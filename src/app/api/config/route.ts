import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    await requirePermission('config.manage')

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('system_config')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message.startsWith('Forbidden:')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requirePermission('config.manage')
    const admin = createAdminClient()

    const body = await request.json()
    const { category, code, label } = body

    if (!category || !code || !label) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const { data, error } = await admin
      .from('system_config')
      .insert([{ category, code, label }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'config.create',
      entity_type: 'system_config',
      entity_id: data.id,
      metadata: { category, code, label },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message.startsWith('Forbidden:')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requirePermission('config.manage')
    const admin = createAdminClient()

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Config id is required' },
        { status: 400 }
      )
    }

    const { error } = await admin
      .from('system_config')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'config.delete',
      entity_type: 'system_config',
      entity_id: id,
      metadata: {},
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message.startsWith('Forbidden:')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}