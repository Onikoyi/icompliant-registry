import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function getIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'students')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export async function GET(req: Request) {
  try {
    await requirePermission('student.update')

    const id = getIdFromUrl(req)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createAdminClient()

    const { data: student, error } = await admin
      .from('students')
      .select(
        `
        id,
        matric_number,
        level,
        admission_year,
        graduation_year,
        academic_status,
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

    if (error || !student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const owner = Array.isArray(student.owners) ? student.owners[0] : student.owners
    if (!owner) return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })

    return NextResponse.json({ student, owner })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requirePermission('student.update')

    const id = getIdFromUrl(req)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const admin = createAdminClient()

    const { data: existing, error: exErr } = await admin
      .from('students')
      .select(
        `
        id,
        matric_number,
        level,
        admission_year,
        graduation_year,
        academic_status,
        owners ( id, full_name, surname, other_names )
      `
      )
      .eq('id', id)
      .single()

    if (exErr || !existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const owner = Array.isArray(existing.owners) ? existing.owners[0] : existing.owners
    if (!owner) return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })

    const studentPatch = body?.student || {}
    const ownerPatch = body?.owner || {}

    const { data: studentUpdated, error: studentErr } = await admin
      .from('students')
      .update({
        matric_number: studentPatch.matric_number,
        level: studentPatch.level,
        admission_year: studentPatch.admission_year,
        graduation_year: studentPatch.graduation_year,
        academic_status: studentPatch.academic_status,
      })
      .eq('id', id)
      .select()
      .single()

    if (studentErr || !studentUpdated) {
      return NextResponse.json({ error: studentErr?.message || 'Failed to update student' }, { status: 500 })
    }

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
      action: 'STUDENT_UPDATED',
      entity_type: 'student',
      entity_id: id,
      metadata: {
        before: { student: existing, owner },
        after: { student: studentUpdated, owner: ownerUpdated },
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