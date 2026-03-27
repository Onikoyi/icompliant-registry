import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const OWNER_KINDS = new Set(['general', 'department', 'student', 'staff'])

function getJobIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'files')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

function norm(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function asBoolOrNull(v: any): boolean | null {
  const s = norm(v)
  if (!s) return null
  return s === 'true' || s === '1' || s.toLowerCase() === 'yes'
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

    // Map department_code -> department_id
    const { data: deps, error: depErr } = await admin.from('departments').select('id, code')
    if (depErr) return NextResponse.json({ error: depErr.message }, { status: 500 })

    const depMap = new Map<string, string>()
    for (const d of deps || []) depMap.set(String(d.code).toLowerCase(), d.id)

    let success = 0
    let failed = 0

    for (const item of items) {
      if (item.status === 'success') continue

      const payload = item.payload as Record<string, any>

      const reference_code = norm(payload.reference_code)
      const title = norm(payload.title)
      const owner_kind = norm(payload.owner_kind)?.toLowerCase() || null
      const department_code = norm(payload.department_code)
      const is_active_raw = asBoolOrNull(payload.is_active)

      if (!reference_code || !title || !owner_kind) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: 'Missing required fields (reference_code, title, owner_kind)',
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      if (!OWNER_KINDS.has(owner_kind)) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Invalid owner_kind: ${owner_kind} (allowed: general|department|student|staff)`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      let department_id: string | null = null
      if (department_code) {
        department_id = depMap.get(department_code.toLowerCase()) || null
        if (!department_id) {
          failed++
          await admin.from('import_items').update({
            status: 'error',
            error_message: `Unknown department_code: ${department_code}`,
            updated_at: new Date().toISOString(),
          }).eq('id', item.id)
          continue
        }
      }

      // If owner_kind is department, department_code is strongly recommended
      if (owner_kind === 'department' && !department_id) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: 'owner_kind=department requires department_code',
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      const is_active = is_active_raw === null ? true : is_active_raw

      // Upsert by reference_code (safe re-run)
      const { data: existing, error: exErr } = await admin
        .from('files')
        .select('id, reference_code')
        .eq('reference_code', reference_code)
        .maybeSingle()

      if (exErr) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: exErr.message,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      let fileId: string

      if (existing?.id) {
        const { data: updated, error: updErr } = await admin
          .from('files')
          .update({
            title,
            owner_kind,
            department_id,
            is_active,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .single()

        if (updErr || !updated) {
          failed++
          await admin.from('import_items').update({
            status: 'error',
            error_message: updErr?.message || 'Failed to update file',
            updated_at: new Date().toISOString(),
          }).eq('id', item.id)
          continue
        }
        fileId = updated.id
      } else {
        const { data: created, error: cErr } = await admin
          .from('files')
          .insert({
            reference_code,
            title,
            owner_kind,
            owner_id: null,
            department_id,
            is_active,
            created_by: user.id,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (cErr || !created) {
          failed++
          const msg = cErr?.message || 'Failed to create file'
          await admin.from('import_items').update({
            status: 'error',
            error_message: msg,
            updated_at: new Date().toISOString(),
          }).eq('id', item.id)
          continue
        }
        fileId = created.id
      }

      success++
      await admin.from('import_items').update({
        status: 'success',
        result_entity_type: 'file',
        result_entity_id: fileId,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)
    }

    await admin.from('import_jobs').update({
      status: 'completed',
      summary: { success, failed, total: items.length },
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    await logAudit({
      actor_user_id: user.id,
      action: 'IMPORT_JOB_PROCESSED',
      entity_type: 'import_job',
      entity_id: jobId,
      metadata: { type: 'files_csv', success, failed, total: items.length },
    })

    return NextResponse.json({ success: true, job_id: jobId, success_count: success, failed_count: failed })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}