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

function getIdFromRequest(req: Request, params?: { id?: string }) {
  const fromParams = String(params?.id ?? '').trim()
  if (fromParams) return fromParams

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return String(last ?? '').trim()
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requirePermission('org.manage')

    const id = getIdFromRequest(req, params)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    const { data: existing, error: exErr } = await admin
      .from('faculties')
      .select('*')
      .eq('id', id)
      .single()

    if (exErr || !existing) return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })

    const campus_id = body?.campus_id === undefined ? undefined : normalizeUuid(body?.campus_id)
    const name = body?.name === undefined ? undefined : normalizeText(body?.name)
    const code = body?.code === undefined ? undefined : normalizeText(body?.code)
    const is_active = body?.is_active === undefined ? undefined : asBool(body?.is_active)

    if (body?.campus_id !== undefined && !campus_id) return NextResponse.json({ error: 'campus_id cannot be empty' }, { status: 400 })
    if (body?.name !== undefined && !name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    if (body?.code !== undefined && !code) return NextResponse.json({ error: 'code cannot be empty' }, { status: 400 })

    const patch: any = {}
    if (campus_id !== undefined) patch.campus_id = campus_id
    if (name !== undefined) patch.name = name
    if (code !== undefined) patch.code = code
    if (is_active !== undefined) patch.is_active = is_active

    const { data: updated, error } = await admin
      .from('faculties')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error || !updated) {
      const message = error?.message || 'Failed to update faculty'
      const isDup = message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'Faculty name/code already exists for this campus' : message },
        { status: isDup ? 409 : 500 }
      )
    }

    const action =
      existing.is_active !== updated.is_active
        ? updated.is_active
          ? 'FACULTY_ACTIVATED'
          : 'FACULTY_DEACTIVATED'
        : 'FACULTY_UPDATED'

    await logAudit({
      actor_user_id: user.id,
      action,
      entity_type: 'faculty',
      entity_id: updated.id,
      metadata: { before: existing, after: updated },
    })

    return NextResponse.json({ faculty: updated })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}