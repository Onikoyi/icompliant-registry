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

function validateExpiry(expiry_required: boolean, expiry_days: any) {
  if (!expiry_required) return { expiry_required: false, expiry_days: null as number | null }

  const n = Number(expiry_days)
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error('expiry_days must be a positive integer when expiry_required is true')
  }

  return { expiry_required: true, expiry_days: n }
}

export async function GET() {
  try {
    await requirePermission('document_type.manage')

    const admin = createAdminClient()

    const [{ data: documentTypes, error: dtError }, { data: departments, error: depError }] =
      await Promise.all([
        admin
          .from('document_types')
          .select(
            `
            id,
            name,
            purpose,
            owner_type,
            requires_approval,
            is_mandatory,
            expiry_required,
            expiry_days,
            is_active,
            department_id,
            created_at,
            updated_at,
            departments:department_id (
              id,
              name,
              code
            )
          `
          )
          .order('name', { ascending: true }),
        admin.from('departments').select('id, name, code').order('name', { ascending: true }),
      ])

    if (dtError) {
      return NextResponse.json({ error: dtError.message }, { status: 500 })
    }

    if (depError) {
      return NextResponse.json({ error: depError.message }, { status: 500 })
    }

    return NextResponse.json({
      documentTypes: documentTypes || [],
      departments: departments || [],
    })
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

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('document_type.manage')

    const body = await req.json()

    const name = normalizeText(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const applies_to = normalizeAppliesTo(body?.applies_to ?? body?.owner_type)
    if (!applies_to) {
      return NextResponse.json(
        { error: "applies_to must be one of: student, staff, both" },
        { status: 400 }
      )
    }

    const purpose = normalizeText(body?.purpose)
    const department_id = normalizeUuid(body?.department_id)
    const requires_approval = asBool(body?.requires_approval)
    const is_mandatory = asBool(body?.is_mandatory)
    const is_active = body?.is_active === undefined ? true : asBool(body?.is_active)

    const expiry = validateExpiry(asBool(body?.expiry_required), body?.expiry_days)

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from('document_types')
      .insert({
        name,
        purpose,
        department_id,
        owner_type: applies_to,
        requires_approval,
        is_mandatory,
        expiry_required: expiry.expiry_required,
        expiry_days: expiry.expiry_days,
        is_active,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !created) {
      // Handle uniqueness error cleanly
      const message = error?.message || 'Failed to create document type'
      const isDuplicate =
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('uq_document_types_name_lower')

      return NextResponse.json(
        { error: isDuplicate ? 'A document type with this name already exists' : message },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'DOCUMENT_TYPE_CREATED',
      entity_type: 'document_type',
      entity_id: created.id,
      metadata: {
        name: created.name,
        owner_type: created.owner_type,
        department_id: created.department_id,
        requires_approval: created.requires_approval,
        is_mandatory: created.is_mandatory,
        expiry_required: created.expiry_required,
        expiry_days: created.expiry_days,
        is_active: created.is_active,
      },
    })

    return NextResponse.json({ documentType: created })
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