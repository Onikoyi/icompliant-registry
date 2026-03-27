import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

function getJobIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'students')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

function norm(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function toIntOrNull(v: any) {
  const s = norm(v)
  if (!s) return null
  const n = Number(s)
  return Number.isInteger(n) ? n : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('import.manage')
    const jobId = getJobIdFromUrl(req)
    if (!jobId) return NextResponse.json({ error: 'Missing job id' }, { status: 400 })

    const admin = createAdminClient()

    // Mark job processing
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

      // Required fields for your system
      const matric_number = norm(payload.matric_number)
      const surname = norm(payload.surname)
      const other_names = norm(payload.other_names)

      // Optional fields
      const full_name = norm(payload.full_name) || [surname, other_names].filter(Boolean).join(' ')
      const programme_id = norm(payload.programme_id) // optional UUID (allow blank)
      const level = norm(payload.level)
      const admission_year = toIntOrNull(payload.admission_year)
      const graduation_year = toIntOrNull(payload.graduation_year)
      const academic_status = norm(payload.academic_status)

      if (!matric_number || !surname || !other_names) {
        failed++
        await admin
          .from('import_items')
          .update({
            status: 'error',
            error_message: 'Missing required fields (matric_number, surname, other_names)',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      // 1) Upsert owner by owner_key = matric_number
      let ownerId: string | null = null

      const { data: existingOwner, error: ownerLookupErr } = await admin
        .from('owners')
        .select('id')
        .eq('owner_key', matric_number)
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

        // Update owner names (safe refresh)
        const { error: ownerUpdErr } = await admin
          .from('owners')
          .update({
            full_name,
            surname,
            other_names,
          })
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
            .insert({
                owner_type: 'student',
                full_name,
                surname,
                other_names,
                owner_key: matric_number,
            })
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

      // 2) Upsert student by matric_number
      const { data: existingStudent, error: stuLookupErr } = await admin
        .from('students')
        .select('id')
        .eq('matric_number', matric_number)
        .maybeSingle()

      if (stuLookupErr) {
        failed++
        await admin
          .from('import_items')
          .update({
            status: 'error',
            error_message: stuLookupErr.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      let studentId: string | null = null

      if (existingStudent?.id) {
        const { data: updatedStudent, error: updErr } = await admin
          .from('students')
          .update({
            owner_id: ownerId,
            programme_id: programme_id || null,
            level: level || null,
            admission_year,
            graduation_year,
            academic_status: academic_status || null,
          })
          .eq('id', existingStudent.id)
          .select()
          .single()

        if (updErr || !updatedStudent) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: updErr?.message || 'Failed to update student',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }
        studentId = updatedStudent.id
      } else {
        const { data: student, error: stuErr } = await admin
          .from('students')
          .insert({
            owner_id: ownerId,
            matric_number,
            programme_id: programme_id || null,
            level: level || null,
            admission_year,
            graduation_year,
            academic_status: academic_status || null,
          })
          .select()
          .single()

        if (stuErr || !student) {
          failed++
          await admin
            .from('import_items')
            .update({
              status: 'error',
              error_message: stuErr?.message || 'Failed to create student',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          continue
        }
        studentId = student.id
      }

      success++
      await admin
        .from('import_items')
        .update({
          status: 'success',
          result_entity_type: 'student',
          result_entity_id: studentId,
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
      metadata: { success, failed, total: items.length, type: 'students_csv' },
    })

    return NextResponse.json({
      success: true,
      job_id: jobId,
      success_count: success,
      failed_count: failed,
    })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}