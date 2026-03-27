import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

function getJobIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'staff')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

function norm(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('import.manage')
    const jobId = getJobIdFromUrl(req)
    if (!jobId) return NextResponse.json({ error: 'Missing job id' }, { status: 400 })

    const admin = createAdminClient()

    await admin
      .from('import_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { data: items, error: itemsErr } = await admin
      .from('import_items')
      .select('id, row_number, payload, status')
      .eq('job_id', jobId)
      .order('row_number', { ascending: true })

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
    if (!items?.length) return NextResponse.json({ error: 'No import items found' }, { status: 404 })

    let success = 0
    let failed = 0

    for (const item of items) {
      if (item.status === 'success') continue

      const payload = item.payload as Record<string, any>

      const staff_number = norm(payload.staff_number)
      const surname = norm(payload.surname)
      const other_names = norm(payload.other_names)

      const full_name = norm(payload.full_name) || [surname, other_names].filter(Boolean).join(' ')
      const employment_type = norm(payload.employment_type)
      const role_title = norm(payload.role_title)
      const employment_status = norm(payload.employment_status)

      if (!staff_number || !surname || !other_names) {
        failed++
        await admin
          .from('import_items')
          .update({
            status: 'error',
            error_message: 'Missing required fields (staff_number, surname, other_names)',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      // 1) Upsert owner by owner_key = staff_number
      let ownerId: string | null = null

      const { data: existingOwner, error: ownerLookupErr } = await admin
        .from('owners')
        .select('id')
        .eq('owner_key', staff_number)
        .maybeSingle()

      if (ownerLookupErr) {
        failed++
        await admin
          .from('import_items')
          .update({
            status: 'error',
            error_message: ownerLookupErr.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      if (existingOwner?.id) {
        ownerId = existingOwner.id

        const { error: ownerUpdErr } = await admin
          .from('owners')
          .update({ full_name, surname, other_names })
          .eq('id', ownerId)

        if (ownerUpdErr) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: ownerUpdErr.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }
      } else {
        const { data: owner, error: ownerErr } = await admin
          .from('owners')
          .insert({  owner_type: 'staff', full_name, surname, other_names, owner_key: staff_number })
          .select()
          .single()

        if (ownerErr || !owner) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: ownerErr?.message || 'Failed to create owner',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }

        ownerId = owner.id
      }

      // 2) Upsert staff by staff_number
      const { data: existingStaff, error: staffLookupErr } = await admin
        .from('staff')
        .select('id')
        .eq('staff_number', staff_number)
        .maybeSingle()

      if (staffLookupErr) {
        failed++
        await admin
          .from('import_items')
          .update({
            status: 'error',
            error_message: staffLookupErr.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      let staffId: string | null = null

      if (existingStaff?.id) {
        const { data: staffUpdated, error: updErr } = await admin
          .from('staff')
          .update({
            owner_id: ownerId,
            employment_type: employment_type || null,
            role_title: role_title || null,
            employment_status: employment_status || null,
          })
          .eq('id', existingStaff.id)
          .select()
          .single()

        if (updErr || !staffUpdated) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: updErr?.message || 'Failed to update staff',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }
        staffId = staffUpdated.id
      } else {
        const { data: staffRow, error: staffErr } = await admin
          .from('staff')
          .insert({
            owner_id: ownerId,
            staff_number,
            employment_type: employment_type || null,
            role_title: role_title || null,
            employment_status: employment_status || null,
          })
          .select()
          .single()

        if (staffErr || !staffRow) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: staffErr?.message || 'Failed to create staff',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }
        staffId = staffRow.id
      }

      success++
      await admin
        .from('import_items')
        .update({
          status: 'success',
          result_entity_type: 'staff',
          result_entity_id: staffId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    }

    await admin
      .from('import_jobs')
      .update({
        status: 'completed',
        summary: { success, failed, total: items.length },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await logAudit({
      actor_user_id: user.id,
      action: 'IMPORT_JOB_PROCESSED',
      entity_type: 'import_job',
      entity_id: jobId,
      metadata: { success, failed, total: items.length, type: 'staff_csv' },
    })

    return NextResponse.json({ success: true, job_id: jobId, success_count: success, failed_count: failed })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}