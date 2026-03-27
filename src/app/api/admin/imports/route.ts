import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    await requirePermission('import.manage')

    const url = new URL(req.url)
    const type = url.searchParams.get('type') // optional
    const status = url.searchParams.get('status') // optional
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50

    const admin = createAdminClient()

    let q = admin
      .from('import_jobs')
      .select('id, type, status, summary, created_by, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) q = q.eq('type', type)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ jobs: data || [] })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}