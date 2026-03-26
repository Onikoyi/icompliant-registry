import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_BUCKET } from '@/lib/storage'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/**
 * NOTE:
 * This route uses service role, so it must do its own permission checks if exposed publicly.
 * Right now it trusts caller-provided owner_id. That can be tightened later with RBAC.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const owner_id = formData.get('owner_id') as string | null
    const document_type_id = formData.get('document_type_id') as string | null
    const source = (formData.get('source') as string) || 'system_upload'

    // Optional: pass actor_user_id from client (recommended)
    const actor_user_id = (formData.get('actor_user_id') as string) || null

    if (!file || !owner_id || !document_type_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ✅ Validate document type exists and is active
    const { data: docType, error: docTypeErr } = await supabaseAdmin
      .from('document_types')
      .select('id, is_active, requires_approval')
      .eq('id', document_type_id)
      .maybeSingle()

    if (docTypeErr) {
      return NextResponse.json({ error: docTypeErr.message }, { status: 500 })
    }

    if (!docType || docType.is_active === false) {
      return NextResponse.json({ error: 'Invalid or inactive document type' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()
    const storagePath = `${owner_id}/${randomUUID()}.${ext}`

    // Upload file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Check if document exists
    const { data: existingDoc } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('owner_id', owner_id)
      .eq('document_type_id', document_type_id)
      .maybeSingle()

    let documentId: string

    if (existingDoc) {
      documentId = existingDoc.id
    } else {
      // ✅ Set status based on requires_approval
      const initialStatus = docType.requires_approval ? 'pending' : 'approved'

      const { data: newDoc, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          owner_id,
          document_type_id,
          title: file.name,
          source,
          status: initialStatus,
        })
        .select()
        .single()

      if (docError || !newDoc) {
        return NextResponse.json({ error: docError?.message }, { status: 500 })
      }

      documentId = newDoc.id
    }

    // Get latest version
    const { data: versions } = await supabaseAdmin
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = versions?.[0]?.version_number ? versions[0].version_number + 1 : 1

    // Insert new version
    const { error: versionError } = await supabaseAdmin
      .from('document_versions')
      .insert({
        document_id: documentId,
        file_path: storagePath,
        version_number: nextVersion,
      })

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }

    // ✅ Audit log: align with src/lib/audit.ts signature
    // If actor_user_id isn't supplied, we still log with a placeholder to avoid crashing.
    // Recommended: pass actor_user_id from server-authenticated context later.
    await logAudit({
      actor_user_id: actor_user_id || owner_id, // fallback (not ideal, but prevents null)
      action: 'DOCUMENT_UPLOAD',
      entity_type: 'document',
      entity_id: documentId,
      metadata: {
        owner_id,
        document_type_id,
        version: nextVersion,
        file_path: storagePath,
        source,
      },
    })

    return NextResponse.json({
      success: true,
      version: nextVersion,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}