import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function normalizeUuid(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function getIdFromRequest(req: Request, params?: { id?: string }) {
  const fromParams = String(params?.id ?? '').trim()
  if (fromParams) return fromParams
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'files')
  if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1]).trim()
  return ''
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requirePermission('file.manage')

    const fileId = getIdFromRequest(req, params)
    if (!fileId) return NextResponse.json({ error: 'Missing file id' }, { status: 400 })

    const body = await req.json()
    const document_id = normalizeUuid(body?.document_id)

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify file exists
    const { data: file, error: fileErr } = await admin.from('files').select('id, reference_code, title').eq('id', fileId).single()
    if (fileErr || !file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Load document
    const { data: doc, error: docErr } = await admin.from('documents').select('id, file_id, owner_id, document_type_id, title, status').eq('id', document_id).single()
    if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (doc.file_id !== fileId) {
      return NextResponse.json({ error: 'Document is not assigned to this file' }, { status: 400 })
    }

    const { data: updated, error: updErr } = await admin
      .from('documents')
      .update({ file_id: null, updated_at: new Date().toISOString() })
      .eq('id', document_id)
      .select()
      .single()

    if (updErr || !updated) {
      return NextResponse.json({ error: updErr?.message || 'Failed to unassign document' }, { status: 500 })
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'FILE_DOCUMENT_UNASSIGNED',
      entity_type: 'file',
      entity_id: fileId,
      metadata: {
        file: { id: file.id, reference_code: file.reference_code, title: file.title },
        document: {
          id: doc.id,
          title: doc.title,
          owner_id: doc.owner_id,
          document_type_id: doc.document_type_id,
          status: doc.status,
          previous_file_id: doc.file_id,
        },
      },
    })

    return NextResponse.json({ success: true, document: updated })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}