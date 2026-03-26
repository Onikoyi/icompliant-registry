import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function asBool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export async function GET() {
  try {
    await requirePermission('org.manage')

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('campuses')
      .select('id, name, code, is_active, created_at')
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ campuses: data || [] })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('org.manage')
    const body = await req.json()

    const name = normalizeText(body?.name)
    const code = normalizeText(body?.code)

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    const is_active = body?.is_active === undefined ? true : asBool(body?.is_active)

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from('campuses')
      .insert({ name, code, is_active })
      .select()
      .single()

    if (error || !created) {
      const message = error?.message || 'Failed to create campus'
      const isDup = message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'Campus name/code already exists' : message },
        { status: isDup ? 409 : 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'CAMPUS_CREATED',
      entity_type: 'campus',
      entity_id: created.id,
      metadata: { name: created.name, code: created.code, is_active: created.is_active },
    })

    return NextResponse.json({ campus: created })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}