'use client'

import { useState } from 'react'

export default function DocumentBulkScanImportPage() {
  const [manifest, setManifest] = useState<File | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    setJobId(null)

    if (!manifest) return setError('Manifest CSV is required.')
    if (!files || files.length === 0) return setError('Please select scan files.')

    const fd = new FormData()
    fd.append('manifest', manifest)
    Array.from(files).forEach((f) => fd.append('files', f))

    const res = await fetch('/api/admin/imports/documents', { method: 'POST', body: fd })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch {}
    if (!res.ok) return setError(data.error || text || 'Failed to create job')

    setJobId(data.job_id)
    setStatus('Job created and files uploaded. You can now process it.')
  }

  async function processJob() {
    if (!jobId) return
    setError('')
    setStatus('Processing...')
    const res = await fetch(`/api/admin/imports/documents/${jobId}/process`, { method: 'POST' })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch {}
    if (!res.ok) return setError(data.error || text || 'Failed to process job')

    setStatus(`Completed. Success: ${data.success_count}, Failed: ${data.failed_count}. See /admin/imports for error rows.`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <h1 className="text-2xl font-bold text-sky-700 mb-2">Bulk Scan Import (Documents)</h1>
          <p className="text-sm text-gray-600 mb-6">
            Upload a manifest CSV + scanned files. Then process to link documents to Student/Staff/File Registry.
          </p>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-sm text-sky-800">
            <div className="font-semibold mb-2">Manifest required headers</div>
            <div className="font-mono text-xs">filename,document_type,link_type,link_key</div>
            <div className="text-xs mt-2 text-sky-700">
              link_type: student | staff | file • link_key: owner_key OR file reference_code
            </div>
          </div>

          {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
          {status && <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">{status}</div>}

          <form onSubmit={createJob} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manifest CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setManifest(e.target.files?.[0] || null)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scanned files (PDF/JPG/PNG)</label>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFiles(e.target.files)} />
            </div>

            <button className="bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded">
              Create Job & Upload Files
            </button>
          </form>

          {jobId && (
            <div className="mt-6 p-4 border rounded bg-gray-50">
              <div className="text-sm text-gray-700">Job created. Process to link records.</div>
              <button onClick={processJob} className="mt-3 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded">
                Process Job
              </button>
              <a href="/admin/imports" className="ml-4 text-sky-700 hover:underline text-sm">
                View in Imports
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}