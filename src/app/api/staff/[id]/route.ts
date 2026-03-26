import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function getIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'staff')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export async function GET(req: Request) {
  try {
    await requirePermission('staff.update')

    const id = getIdFromUrl(req)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createAdminClient()

    const { data: staff, error } = await admin
      .from('staff')
      .select(
        `
        id,
        staff_number,
        employment_type,
        role_title,
        employment_status,
        owners (
          id,
          full_name,
          surname,
          other_names,
          owner_key
        )
      `
      )
      .eq('id', id)
      .single()

    if (error || !staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

    const owner = Array.isArray(staff.owners) ? staff.owners[0] : staff.owners
    if (!owner) return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })

    return NextResponse.json({ staff, owner })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requirePermission('staff.update')

    const id = getIdFromUrl(req)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    const { data: existing, error: exErr } = await admin
      .from('staff')
      .select(
        `
        id,
        staff_number,
        employment_type,
        role_title,
        employment_status,
        owners ( id, full_name, surname, other_names )
      `
      )
      .eq('id', id)
      .single()

    if (exErr || !existing) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

    const owner = Array.isArray(existing.owners) ? existing.owners[0] : existing.owners
    if (!owner) return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })

    const staffPatch = body?.staff || {}
    const ownerPatch = body?.owner || {}

    // Update staff table
    const { data: staffUpdated, error: staffErr } = await admin
      .from('staff')
      .update({
        staff_number: staffPatch.staff_number,
        employment_type: staffPatch.employment_type,
        role_title: staffPatch.role_title,
        employment_status: staffPatch.employment_status,
      })
      .eq('id', id)
      .select()
      .single()

    if (staffErr || !staffUpdated) {
      return NextResponse.json({ error: staffErr?.message || 'Failed to update staff' }, { status: 500 })
    }

    // Update owners table (names only)
    const { data: ownerUpdated, error: ownerErr } = await admin
      .from('owners')
      .update({
        full_name: ownerPatch.full_name,
        surname: ownerPatch.surname,
        other_names: ownerPatch.other_names,
      })
      .eq('id', owner.id)
      .select()
      .single()

    if (ownerErr || !ownerUpdated) {
      return NextResponse.json({ error: ownerErr?.message || 'Failed to update owner' }, { status: 500 })
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'STAFF_UPDATED',
      entity_type: 'staff',
      entity_id: id,
      metadata: {
        before: { staff: existing, owner },
        after: { staff: staffUpdated, owner: ownerUpdated },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}