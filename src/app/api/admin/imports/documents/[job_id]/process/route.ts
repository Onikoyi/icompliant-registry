import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

function getJobIdFromUrl(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'documents')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

function norm(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function lower(v: any) {
  const s = norm(v)
  return s ? s.toLowerCase() : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('import.manage')
    const admin = createAdminClient()

    const jobId = getJobIdFromUrl(req)
    if (!jobId) return NextResponse.json({ error: 'Missing job id' }, { status: 400 })

    await admin.from('import_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', jobId)

    const { data: items, error: itemsErr } = await admin
      .from('import_items')
      .select('id, row_number, payload, status')
      .eq('job_id', jobId)
      .order('row_number', { ascending: true })

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
    if (!items?.length) return NextResponse.json({ error: 'No items found' }, { status: 404 })

    let success = 0
    let failed = 0

    for (const item of items) {
      if (item.status === 'success') continue
      if (item.status === 'error') continue // leave errors for review; user can fix and rerun by setting back to pending later

      const payload = item.payload as Record<string, any>

      const filename = norm(payload.filename)
      const storage_path = norm(payload.storage_path)
      const docTypeName = lower(payload.document_type)
      const link_type = lower(payload.link_type) // student|staff|file
      const link_key = norm(payload.link_key)
      const title = norm(payload.title) || filename
      const note = norm(payload.note)
      const status_override = lower(payload.status_override) // pending/approved/rejected

      if (!filename || !storage_path || !docTypeName || !link_type || !link_key) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: 'Missing required fields in row (filename, storage_path, document_type, link_type, link_key)',
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      if (!['student', 'staff', 'file'].includes(link_type)) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Invalid link_type: ${link_type}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      // Resolve document type by name (case-insensitive)
      const { data: docTypes, error: dtErr } = await admin
        .from('document_types')
        .select('id, name, is_active, requires_approval')
        .ilike('name', docTypeName) // exact-ish; if you want strict equality, we can enforce later
      if (dtErr) {
        failed++
        await admin.from('import_items').update({ status: 'error', error_message: dtErr.message, updated_at: new Date().toISOString() }).eq('id', item.id)
        continue
      }

      const docType = (docTypes || []).find((d) => String(d.name).toLowerCase() === docTypeName)
      if (!docType) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Unknown document_type: ${payload.document_type}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }
      if (docType.is_active === false) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Inactive document_type: ${docType.name}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      const status =
        status_override === 'approved' || status_override === 'rejected' || status_override === 'pending'
          ? status_override
          : (docType.requires_approval ? 'pending' : 'approved')

      // Link target resolution
      let owner_id: string | null = null
      let file_id: string | null = null

      if (link_type === 'student' || link_type === 'staff') {
        const { data: owner, error: oErr } = await admin
          .from('owners')
          .select('id')
          .eq('owner_key', link_key)
          .maybeSingle()

        if (oErr || !owner) {
          failed++
          await admin.from('import_items').update({
            status: 'error',
            error_message: `Owner not found for owner_key: ${link_key}`,
            updated_at: new Date().toISOString(),
          }).eq('id', item.id)
          continue
        }
        owner_id = owner.id
      }

      if (link_type === 'file') {
        const { data: f, error: fErr } = await admin
          .from('files')
          .select('id')
          .eq('reference_code', link_key)
          .maybeSingle()

        if (fErr || !f) {
          failed++
          await admin.from('import_items').update({
            status: 'error',
            error_message: `File cover not found for reference_code: ${link_key}`,
            updated_at: new Date().toISOString(),
          }).eq('id', item.id)
          continue
        }
        file_id = f.id
      }

      // Create / Upsert document + version
      try {
        let documentId: string | null = null

        if (link_type === 'student' || link_type === 'staff') {
          // Upsert by (owner_id, document_type_id)
          const { data: existing } = await admin
            .from('documents')
            .select('id')
            .eq('owner_id', owner_id!)
            .eq('document_type_id', docType.id)
            .maybeSingle()

          if (existing?.id) {
            documentId = existing.id

            await admin.from('documents').update({
              title,
              status,
              source: 'bulk_scan',
              updated_at: new Date().toISOString(),
            }).eq('id', documentId)
          } else {
            const { data: created, error: cErr } = await admin
              .from('documents')
              .insert({
                owner_id,
                file_id: null,
                document_type_id: docType.id,
                title,
                description: null,
                status,
                source: 'bulk_scan',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single()

            if (cErr || !created) throw new Error(cErr?.message || 'Failed to create document')
            documentId = created.id
          }
        } else {
          // file registry docs: create new document each row
          const { data: created, error: cErr } = await admin
            .from('documents')
            .insert({
              owner_id: null,
              file_id,
              document_type_id: docType.id,
              title,
              description: null,
              status,
              source: 'bulk_scan',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (cErr || !created) throw new Error(cErr?.message || 'Failed to create document')
          documentId = created.id
        }

        // Versioning: increment
        const { data: versions } = await admin
          .from('document_versions')
          .select('version_number')
          .eq('document_id', documentId!)
          .order('version_number', { ascending: false })
          .limit(1)

        const nextVersion = versions?.[0]?.version_number ? versions[0].version_number + 1 : 1

        const { error: vErr } = await admin.from('document_versions').insert({
          document_id: documentId!,
          file_path: storage_path,
          version_number: nextVersion,
        })
        if (vErr) throw new Error(vErr.message)

        // Workflow log
        await admin.from('document_workflow_logs').insert({
          document_id: documentId!,
          action: 'bulk_scan_import',
          performed_by: user.id,
          metadata: {
            note: note || null,
            link_type,
            link_key,
            status,
            version: nextVersion,
            filename,
          },
        })

        await logAudit({
          actor_user_id: user.id,
          action: 'BULK_SCAN_DOCUMENT_LINKED',
          entity_type: 'document',
          entity_id: documentId!,
          metadata: { link_type, link_key, document_type: docType.name, status, version: nextVersion, filename },
        })

        success++
        await admin.from('import_items').update({
          status: 'success',
          result_entity_type: 'document',
          result_entity_id: documentId!,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
      } catch (e: any) {
        failed++
        await admin.from('import_items').update({
          status: 'error',
          error_message: e.message || 'Processing failed',
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
      }
    }

    await admin.from('import_jobs').update({
      status: 'completed',
      summary: { success, failed, total: items.length },
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    return NextResponse.json({ success: true, job_id: jobId, success_count: success, failed_count: failed })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}