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

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { user } = await requirePermission('org.manage')
    const id = String(ctx?.params?.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    const { data: existing, error: exErr } = await admin.from('departments').select('*').eq('id', id).single()
    if (exErr || !existing) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

    const faculty_id = body?.faculty_id === undefined ? undefined : normalizeUuid(body?.faculty_id)
    const name = body?.name === undefined ? undefined : normalizeText(body?.name)
    const code = body?.code === undefined ? undefined : normalizeText(body?.code)
    const is_active = body?.is_active === undefined ? undefined : asBool(body?.is_active)

    if (body?.faculty_id !== undefined && !faculty_id) return NextResponse.json({ error: 'faculty_id cannot be empty' }, { status: 400 })
    if (body?.name !== undefined && !name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    if (body?.code !== undefined && !code) return NextResponse.json({ error: 'code cannot be empty' }, { status: 400 })

    const patch: any = {}
    if (faculty_id !== undefined) patch.faculty_id = faculty_id
    if (name !== undefined) patch.name = name
    if (code !== undefined) patch.code = code
    if (is_active !== undefined) patch.is_active = is_active

    const { data: updated, error } = await admin.from('departments').update(patch).eq('id', id).select().single()

    if (error || !updated) {
      const message = error?.message || 'Failed to update department'
      const isDup = message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'Department name/code already exists for this faculty' : message },
        { status: isDup ? 409 : 500 }
      )
    }

    const action =
      existing.is_active !== updated.is_active
        ? updated.is_active
          ? 'DEPARTMENT_ACTIVATED'
          : 'DEPARTMENT_DEACTIVATED'
        : 'DEPARTMENT_UPDATED'

    await logAudit({
      actor_user_id: user.id,
      action,
      entity_type: 'department',
      entity_id: updated.id,
      metadata: { before: existing, after: updated },
    })

    return NextResponse.json({ department: updated })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}