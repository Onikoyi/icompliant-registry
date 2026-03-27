import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUserWithPermissions } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv'
import { logAudit } from '@/lib/audit'

function reqField(row: Record<string, string>, key: string) {
  const v = String(row[key] ?? '').trim()
  return v ? v : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('import.manage')

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })

    const csvText = await file.text()
    const { headers, rows } = parseCSV(csvText)

    if (headers.length === 0) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })
    if (rows.length === 0) return NextResponse.json({ error: 'No data rows found' }, { status: 400 })

    // Required headers for demo (we can expand later)
    const requiredHeaders = ['matric_number', 'surname', 'other_names', 'department_code']
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
    if (missingHeaders.length) {
      return NextResponse.json(
        { error: `Missing headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Create job
    const { data: job, error: jobErr } = await admin
      .from('import_jobs')
      .insert({
        type: 'students_csv',
        status: 'queued',
        created_by: user.id,
        summary: { original_filename: file.name, total_rows: rows.length },
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobErr || !job) return NextResponse.json({ error: jobErr?.message || 'Failed to create job' }, { status: 500 })

    // Create items (pending)
    const items = rows.map((r, idx) => ({
      job_id: job.id,
      row_number: idx + 2, // +2 because header is line 1
      payload: r,
      status: 'pending',
    }))

    const { error: itemsErr } = await admin.from('import_items').insert(items)
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

    await logAudit({
      actor_user_id: user.id,
      action: 'IMPORT_JOB_CREATED',
      entity_type: 'import_job',
      entity_id: job.id,
      metadata: { type: 'students_csv', filename: file.name, total_rows: rows.length },
    })

    return NextResponse.json({ success: true, job_id: job.id, total_rows: rows.length })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}