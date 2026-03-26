import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function normalizeUuid(v: any): string | null {
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

    const [{ data: faculties, error: fErr }, { data: campuses, error: cErr }] = await Promise.all([
      admin
        .from('faculties')
        .select(
          `
          id, campus_id, name, code, is_active, created_at,
          campuses:campus_id (id, name, code)
        `
        )
        .order('name', { ascending: true }),
      admin.from('campuses').select('id, name, code, is_active').order('name', { ascending: true }),
    ])

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    return NextResponse.json({ faculties: faculties || [], campuses: campuses || [] })
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

    const campus_id = normalizeUuid(body?.campus_id)
    const name = normalizeText(body?.name)
    const code = normalizeText(body?.code)

    if (!campus_id) return NextResponse.json({ error: 'campus_id is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    const is_active = body?.is_active === undefined ? true : asBool(body?.is_active)

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from('faculties')
      .insert({ campus_id, name, code, is_active })
      .select()
      .single()

    if (error || !created) {
      const message = error?.message || 'Failed to create faculty'
      const isDup = message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'Faculty name/code already exists for this campus' : message },
        { status: isDup ? 409 : 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'FACULTY_CREATED',
      entity_type: 'faculty',
      entity_id: created.id,
      metadata: { campus_id: created.campus_id, name: created.name, code: created.code, is_active: created.is_active },
    })

    return NextResponse.json({ faculty: created })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}