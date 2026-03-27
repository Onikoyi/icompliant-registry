import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

type AppliesTo = 'student' | 'staff' | 'both'

function asBool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}



function normalizeAppliesTo(v: any): AppliesTo | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'student' || s === 'staff' || s === 'both') return s
  return null
}

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function normalizeUuid(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function getIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'document-types')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

function validateExpiry(expiry_required: boolean, expiry_days: any) {
  if (!expiry_required) return { expiry_required: false, expiry_days: null as number | null }

  const n = Number(expiry_days)
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error('expiry_days must be a positive integer when expiry_required is true')
  }

  return { expiry_required: true, expiry_days: n }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { user } = await requirePermission('document_type.manage')

    const id = getIdFromUrl(req)
if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    // Load existing for audit diff + safety
    const { data: existing, error: existingErr } = await admin
      .from('document_types')
      .select('*')
      .eq('id', id)
      .single()

    if (existingErr || !existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 })
    }

    const name = body?.name === undefined ? undefined : normalizeText(body?.name)
    if (body?.name !== undefined && !name) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }

    const applies_to =
      body?.applies_to === undefined && body?.owner_type === undefined
        ? undefined
        : normalizeAppliesTo(body?.applies_to ?? body?.owner_type)

    if ((body?.applies_to !== undefined || body?.owner_type !== undefined) && !applies_to) {
      return NextResponse.json(
        { error: "applies_to must be one of: student, staff, both" },
        { status: 400 }
      )
    }

    const purpose = body?.purpose === undefined ? undefined : normalizeText(body?.purpose)
    const department_id =
      body?.department_id === undefined ? undefined : normalizeUuid(body?.department_id)

    const requires_approval =
      body?.requires_approval === undefined ? undefined : asBool(body?.requires_approval)

    const is_mandatory = body?.is_mandatory === undefined ? undefined : asBool(body?.is_mandatory)

    const is_active = body?.is_active === undefined ? undefined : asBool(body?.is_active)

    const expiry_required =
      body?.expiry_required === undefined ? undefined : asBool(body?.expiry_required)

    const expiry_days = body?.expiry_days === undefined ? undefined : body?.expiry_days

    let expiryPatch: { expiry_required?: boolean; expiry_days?: number | null } = {}
    if (expiry_required !== undefined || expiry_days !== undefined) {
      const resolvedExpiryRequired =
        expiry_required !== undefined ? expiry_required : !!existing.expiry_required
      expiryPatch = validateExpiry(resolvedExpiryRequired, expiry_days ?? existing.expiry_days)
    }

    const patch: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) patch.name = name
    if (purpose !== undefined) patch.purpose = purpose
    if (department_id !== undefined) patch.department_id = department_id
    if (applies_to !== undefined) patch.owner_type = applies_to
    if (requires_approval !== undefined) patch.requires_approval = requires_approval
    if (is_mandatory !== undefined) patch.is_mandatory = is_mandatory
    if (is_active !== undefined) patch.is_active = is_active
    if (expiry_required !== undefined || expiry_days !== undefined) {
      patch.expiry_required = expiryPatch.expiry_required
      patch.expiry_days = expiryPatch.expiry_days
    }

    const { data: updated, error } = await admin
      .from('document_types')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error || !updated) {
      const message = error?.message || 'Failed to update document type'
      const isDuplicate =
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('uq_document_types_name_lower')

      return NextResponse.json(
        { error: isDuplicate ? 'A document type with this name already exists' : message },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    const activationAction =
      existing.is_active !== updated.is_active
        ? updated.is_active
          ? 'DOCUMENT_TYPE_ACTIVATED'
          : 'DOCUMENT_TYPE_DEACTIVATED'
        : null

    await logAudit({
      actor_user_id: user.id,
      action: activationAction || 'DOCUMENT_TYPE_UPDATED',
      entity_type: 'document_type',
      entity_id: updated.id,
      metadata: {
        before: {
          name: existing.name,
          purpose: existing.purpose,
          owner_type: existing.owner_type,
          department_id: existing.department_id,
          requires_approval: existing.requires_approval,
          is_mandatory: existing.is_mandatory,
          expiry_required: existing.expiry_required,
          expiry_days: existing.expiry_days,
          is_active: existing.is_active,
        },
        after: {
          name: updated.name,
          purpose: updated.purpose,
          owner_type: updated.owner_type,
          department_id: updated.department_id,
          requires_approval: updated.requires_approval,
          is_mandatory: updated.is_mandatory,
          expiry_required: updated.expiry_required,
          expiry_days: updated.expiry_days,
          is_active: updated.is_active,
        },
      },
    })

    return NextResponse.json({ documentType: updated })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'

    if (msg === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (msg.startsWith('Forbidden:')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}