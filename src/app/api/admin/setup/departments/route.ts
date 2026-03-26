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

    const [{ data: departments, error: dErr }, { data: faculties, error: fErr }] = await Promise.all([
      admin
        .from('departments')
        .select(
          `
          id, faculty_id, name, code, is_active, created_at,
          faculties:faculty_id (id, name, code, campus_id)
        `
        )
        .order('name', { ascending: true }),
      admin.from('faculties').select('id, campus_id, name, code, is_active').order('name', { ascending: true }),
    ])

    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

    return NextResponse.json({ departments: departments || [], faculties: faculties || [] })
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

    const faculty_id = normalizeUuid(body?.faculty_id)
    const name = normalizeText(body?.name)
    const code = normalizeText(body?.code)

    if (!faculty_id) return NextResponse.json({ error: 'faculty_id is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    const is_active = body?.is_active === undefined ? true : asBool(body?.is_active)

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from('departments')
      .insert({ faculty_id, name, code, is_active })
      .select()
      .single()

    if (error || !created) {
      const message = error?.message || 'Failed to create department'
      const isDup = message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'Department name/code already exists for this faculty' : message },
        { status: isDup ? 409 : 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'DEPARTMENT_CREATED',
      entity_type: 'department',
      entity_id: created.id,
      metadata: { faculty_id: created.faculty_id, name: created.name, code: created.code, is_active: created.is_active },
    })

    return NextResponse.json({ department: created })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}