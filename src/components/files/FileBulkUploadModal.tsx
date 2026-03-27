'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCompleted: () => Promise<void> | void // refresh list after import
}

export default function FileBulkUploadModal({ isOpen, onClose, onCompleted }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  async function createJob() {
    setError('')
    setStatus('')
    setJobId(null)

    if (!file) return setError('Please select a CSV file.')

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/admin/imports/files', { method: 'POST', body: fd })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(data.error || text || 'Failed to create import job')

      setJobId(data.job_id)
      setStatus(`Job created. Total rows: ${data.total_rows}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create job')
    } finally {
      setBusy(false)
    }
  }

  async function processJob() {
    if (!jobId) return
    setError('')
    setStatus('Processing...')
    setBusy(true)

    try {
      const res = await fetch(`/api/admin/imports/files/${jobId}/process`, { method: 'POST' })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(data.error || text || 'Failed to process job')

      setStatus(`Completed. Success: ${data.success_count}, Failed: ${data.failed_count}`)
      await onCompleted()
    } catch (e: any) {
      setError(e.message || 'Failed to process job')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-sky-200 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-sky-700">Bulk Upload File Covers (CSV)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload file registry covers in bulk (reference_code/title/owner_kind/department_code).
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:underline">Close</button>
        </div>

        <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800">
          <div className="font-semibold mb-2">Required headers</div>
          <div className="font-mono text-xs">
            reference_code,title,owner_kind,department_code,is_active
          </div>
          <div className="text-xs mt-2 text-sky-700">
            owner_kind allowed: general|department|student|staff • department_code uses Department Setup code (not UUID)
          </div>
        </div>

        {error && <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
        {status && <div className="mt-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">{status}</div>}

        <div className="mt-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={createJob}
            disabled={busy}
            className="bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white px-4 py-2 rounded"
          >
            Create Import Job
          </button>

          <button
            onClick={processJob}
            disabled={busy || !jobId}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-4 py-2 rounded"
          >
            Process Job
          </button>

          {jobId && (
            <a href={`/admin/imports/${jobId}`} className="text-sky-700 hover:underline text-sm self-center">
              View job details (errors)
            </a>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Tip: Importing file covers first makes bulk scan linking by reference_code much faster and cleaner.
        </div>
      </div>
    </div>
  )
}