import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

/**
 * Always derive the fileId from the URL. This avoids Next's async params behavior.
 * URL shape: /api/admin/files/{fileId}/documents
 */
function getFileIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'files')
  const id = idx >= 0 ? parts[idx + 1] : ''
  return String(id ?? '').trim()
}

export async function GET(req: Request) {
  try {
    await requirePermission('file.view')

    const fileId = getFileIdFromUrl(req)
    if (!fileId) return NextResponse.json({ error: 'Missing file id' }, { status: 400 })

    const url = new URL(req.url)
    const includeUnassigned = url.searchParams.get('include_unassigned') === 'true'
    const q = normalizeText(url.searchParams.get('q'))
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50

    const admin = createAdminClient()

    // 1) Documents already inside this file
    let inFileQuery = admin
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
        file_id,
        created_at,
        updated_at,
        document_types:document_type_id (
          id,
          name,
          owner_type
        )
      `
      )
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (q) {
      inFileQuery = inFileQuery.or(`title.ilike.%${q}%,status.ilike.%${q}%`)
    }

    const { data: inFile, error: inFileErr } = await inFileQuery
    if (inFileErr) return NextResponse.json({ error: inFileErr.message }, { status: 500 })

    // 2) Optional: unassigned docs to assign
    let unassigned: any[] = []
    if (includeUnassigned) {
      let unassignedQuery = admin
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
          file_id,
          created_at,
          updated_at,
          document_types:document_type_id (
            id,
            name,
            owner_type
          )
        `
        )
        .is('file_id', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (q) {
        unassignedQuery = unassignedQuery.or(`title.ilike.%${q}%,status.ilike.%${q}%`)
      }

      const { data: unassignedData, error: unassignedErr } = await unassignedQuery
      if (unassignedErr) return NextResponse.json({ error: unassignedErr.message }, { status: 500 })
      unassigned = unassignedData || []
    }

    return NextResponse.json({
      inFile: inFile || [],
      unassigned,
    })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}