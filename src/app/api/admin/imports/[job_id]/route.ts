import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'

function getJobIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'imports')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export async function GET(req: Request) {
  try {
    await requirePermission('import.manage')

    const jobId = getJobIdFromUrl(req)
    if (!jobId) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

    const admin = createAdminClient()

    const { data: job, error: jobErr } = await admin
      .from('import_jobs')
      .select('id, type, status, summary, created_by, created_at, updated_at')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Only error rows (demo-friendly)
    const { data: errors, error: errErr } = await admin
      .from('import_items')
      .select('id, row_number, error_message, payload, updated_at')
      .eq('job_id', jobId)
      .eq('status', 'error')
      .order('row_number', { ascending: true })
      .limit(200)

    if (errErr) return NextResponse.json({ error: errErr.message }, { status: 500 })

    return NextResponse.json({ job, errors: errors || [] })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}