import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { DOCUMENT_BUCKET } from '@/lib/storage'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('file.manage')

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const file_id = normalizeText(formData.get('file_id'))
    const document_type_id = normalizeText(formData.get('document_type_id'))
    const titleOverride = normalizeText(formData.get('title'))
    const source = (formData.get('source') as string) || 'file_upload'

    if (!file || !file_id || !document_type_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5MB' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ✅ Validate file exists
    const { data: fileRow, error: fErr } = await admin
      .from('files')
      .select('id, reference_code, title, is_active')
      .eq('id', file_id)
      .single()

    if (fErr || !fileRow) {
      return NextResponse.json({ error: 'File cover not found' }, { status: 404 })
    }
    if (fileRow.is_active === false) {
      return NextResponse.json({ error: 'File cover is inactive' }, { status: 400 })
    }

    // ✅ Validate document type exists + active + get requires_approval
    const { data: docType, error: dtErr } = await admin
      .from('document_types')
      .select('id, name, is_active, requires_approval')
      .eq('id', document_type_id)
      .maybeSingle()

    if (dtErr) return NextResponse.json({ error: dtErr.message }, { status: 500 })
    if (!docType || docType.is_active === false) {
      return NextResponse.json({ error: 'Invalid or inactive document type' }, { status: 400 })
    }

    // ✅ Storage path under the file cover (keeps registry docs separate from owner docs)
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()
    const storagePath = `files/${file_id}/${randomUUID()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const status = docType.requires_approval ? 'pending' : 'approved'
    const title = titleOverride || file.name

    // ✅ Create a new document record (registry-style docs are not constrained to one per owner/type)
    const { data: newDoc, error: docErr } = await admin
      .from('documents')
      .insert({
        owner_id: null, // ✅ registry doc (no staff/student owner)
        file_id,
        document_type_id,
        title,
        description: null,
        source,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return NextResponse.json({ error: docErr?.message || 'Failed to create document' }, { status: 500 })
    }

    // ✅ Version 1
    const { error: versionErr } = await admin.from('document_versions').insert({
      document_id: newDoc.id,
      file_path: storagePath,
      version_number: 1,
    })

    if (versionErr) {
      return NextResponse.json({ error: versionErr.message }, { status: 500 })
    }

    // ✅ Audit
    await logAudit({
      actor_user_id: user.id,
      action: 'FILE_DOCUMENT_UPLOAD',
      entity_type: 'file',
      entity_id: file_id,
      metadata: {
        file: { id: fileRow.id, reference_code: fileRow.reference_code, title: fileRow.title },
        document: {
          id: newDoc.id,
          title: newDoc.title,
          document_type_id,
          document_type_name: docType.name,
          status,
          file_path: storagePath,
          source,
          version: 1,
        },
      },
    })

    // ✅ Workflow log (optional but good for demo)
    await admin.from('document_workflow_logs').insert({
      document_id: newDoc.id,
      action: 'uploaded',
      performed_by: user.id,
      metadata: {
        source,
        file_id,
        status,
      },
    })

    return NextResponse.json({
      success: true,
      document_id: newDoc.id,
      status,
    })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}