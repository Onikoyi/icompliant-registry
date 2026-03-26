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
  return String(parts[parts.length - 1] ?? '').trim()
}

const OWNER_KINDS = new Set(['general', 'department', 'student', 'staff'])

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requirePermission('file.manage')
    const id = getIdFromRequest(req, params)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    const { data: existing, error: exErr } = await admin.from('files').select('*').eq('id', id).single()
    if (exErr || !existing) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const reference_code = body?.reference_code === undefined ? undefined : normalizeText(body?.reference_code)
    const title = body?.title === undefined ? undefined : normalizeText(body?.title)
    const description = body?.description === undefined ? undefined : normalizeText(body?.description)

    const owner_kind = body?.owner_kind === undefined ? undefined : normalizeText(body?.owner_kind)
    const owner_id = body?.owner_id === undefined ? undefined : normalizeUuid(body?.owner_id)
    const department_id = body?.department_id === undefined ? undefined : normalizeUuid(body?.department_id)

    const is_active = body?.is_active === undefined ? undefined : asBool(body?.is_active)

    if (body?.reference_code !== undefined && !reference_code) return NextResponse.json({ error: 'reference_code cannot be empty' }, { status: 400 })
    if (body?.title !== undefined && !title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    if (owner_kind !== undefined && !OWNER_KINDS.has(owner_kind)) {
      return NextResponse.json({ error: 'owner_kind must be one of general|department|student|staff' }, { status: 400 })
    }

    const patch: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (reference_code !== undefined) patch.reference_code = reference_code
    if (title !== undefined) patch.title = title
    if (description !== undefined) patch.description = description
    if (owner_kind !== undefined) patch.owner_kind = owner_kind
    if (owner_id !== undefined) patch.owner_id = owner_id
    if (department_id !== undefined) patch.department_id = department_id
    if (is_active !== undefined) patch.is_active = is_active

    const { data: updated, error } = await admin.from('files').update(patch).eq('id', id).select().single()
    if (error || !updated) {
      const msg = error?.message || 'Failed to update file'
      const isDup = msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'A file with this reference code already exists' : msg },
        { status: isDup ? 409 : 500 }
      )
    }

    const action =
      existing.is_active !== updated.is_active
        ? updated.is_active
          ? 'FILE_ACTIVATED'
          : 'FILE_DEACTIVATED'
        : 'FILE_UPDATED'

    await logAudit({
      actor_user_id: user.id,
      action,
      entity_type: 'file',
      entity_id: updated.id,
      metadata: { before: existing, after: updated },
    })

    return NextResponse.json({ file: updated })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}