import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

function getIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'documents')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export async function GET(req: Request) {
  try {
    const { permissions } = await getCurrentUserWithPermissions()
    const canApprove = permissions.includes('document.approve')
    const canReject = permissions.includes('document.reject')
    if (!canApprove && !canReject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = getIdFromUrl(req)
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('documents')
      .select(
        `
        id,
        owner_id,
        document_type_id,
        title,
        description,
        status,
        source,
        created_at,
        updated_at,
        document_types:document_type_id ( id, name, owner_type ),
        document_versions ( id, version_number, file_path, created_at ),
        document_workflow_logs (
          id,
          action,
          created_at,
          metadata,
          users:performed_by ( email )
        )
      `
      )
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // Ensure versions are returned newest-first for UI convenience
    const versions = (data as any).document_versions || []
    versions.sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0))
    ;(data as any).document_versions = versions

    return NextResponse.json({ document: data })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}