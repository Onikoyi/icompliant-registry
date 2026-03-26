import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'

export async function GET() {
  try {
    await requirePermission('file.manage')

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('document_types')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ documentTypes: data || [] })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}