import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

export async function GET(req: Request) {
  try {
    const { permissions } = await getCurrentUserWithPermissions()

    // Allow queue access if user can approve or reject
    const canApprove = permissions.includes('document.approve')
    const canReject = permissions.includes('document.reject')

    if (!canApprove && !canReject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const q = normalizeText(url.searchParams.get('q'))
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50

    const admin = createAdminClient()

    let query = admin
      .from('documents')
      .select(
        `
        id,
        owner_id,
        document_type_id,
        title,
        status,
        source,
        created_at,
        updated_at,
        file_id,
        document_types:document_type_id (
          id,
          name,
          owner_type,
          requires_approval
        )
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (q) {
      query = query.or(`title.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ documents: data || [] })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}