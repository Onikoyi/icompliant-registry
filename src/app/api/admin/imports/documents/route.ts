import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv'
import { DOCUMENT_BUCKET } from '@/lib/storage'
import { logAudit } from '@/lib/audit'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB for scans (adjust if needed)
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

function norm(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : null
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('import.manage')
    const admin = createAdminClient()

    const formData = await req.formData()
    const manifest = formData.get('manifest') as File | null
    if (!manifest) return NextResponse.json({ error: 'Manifest CSV is required' }, { status: 400 })

    // collect uploaded scan files
    const uploadedFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) uploadedFiles.push(value)
    }
    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'At least one scan file is required' }, { status: 400 })
    }

    // Parse CSV manifest
    const csvText = await manifest.text()
    const { headers, rows } = parseCSV(csvText)

    const requiredHeaders = ['filename', 'document_type', 'link_type', 'link_key']
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
    if (missingHeaders.length) {
      return NextResponse.json({ error: `Missing headers: ${missingHeaders.join(', ')}` }, { status: 400 })
    }

    // Create job
    const { data: job, error: jobErr } = await admin
      .from('import_jobs')
      .insert({
        type: 'documents_manifest',
        status: 'queued',
        created_by: user.id,
        summary: {
          manifest_filename: manifest.name,
          total_rows: rows.length,
          uploaded_files: uploadedFiles.length,
        },
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobErr || !job) return NextResponse.json({ error: jobErr?.message || 'Failed to create job' }, { status: 500 })

    // Build map of actual uploaded files by name
    const fileMap = new Map<string, File>()
    for (const f of uploadedFiles) fileMap.set(f.name, f)

    // Create items (pending) and upload files for those rows where file exists
    const itemRows = rows.map((r, idx) => ({
      job_id: job.id,
      row_number: idx + 2,
      payload: r,
      status: 'pending',
    }))

    const { data: createdItems, error: itemsErr } = await admin
      .from('import_items')
      .insert(itemRows)
      .select('id, row_number, payload')

    if (itemsErr || !createdItems) return NextResponse.json({ error: itemsErr?.message || 'Failed to create items' }, { status: 500 })

    // Upload scan files and annotate item payload with storage_path
    // storage path: bulk/<jobId>/<filename>
    for (const item of createdItems) {
      const payload = item.payload as Record<string, any>
      const filename = norm(payload.filename)
      if (!filename) continue

      const scan = fileMap.get(filename)
      if (!scan) {
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Uploaded files missing: ${filename}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      if (!ALLOWED_TYPES.includes(scan.type)) {
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Invalid file type for ${filename}: ${scan.type}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      if (scan.size > MAX_FILE_SIZE) {
        await admin.from('import_items').update({
          status: 'error',
          error_message: `File too large for ${filename} (>${MAX_FILE_SIZE} bytes)`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      const buffer = Buffer.from(await scan.arrayBuffer())
      const storagePath = `bulk/${job.id}/${filename}`

      const { error: upErr } = await admin.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, buffer, { contentType: scan.type, upsert: true })

      if (upErr) {
        await admin.from('import_items').update({
          status: 'error',
          error_message: `Storage upload failed for ${filename}: ${upErr.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id)
        continue
      }

      // Update payload with storage_path so processing can use it
      await admin.from('import_items').update({
        payload: { ...payload, storage_path: storagePath },
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'IMPORT_JOB_CREATED',
      entity_type: 'import_job',
      entity_id: job.id,
      metadata: { type: 'documents_manifest', manifest: manifest.name, total_rows: rows.length },
    })

    return NextResponse.json({ success: true, job_id: job.id })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}