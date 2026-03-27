'use client'

import { useMemo, useState } from 'react'

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    setJobId(null)

    if (!file) return setError('Please select a CSV file.')

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/admin/imports/students', { method: 'POST', body: fd })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch {}
    if (!res.ok) return setError(data.error || text || 'Failed to create import job')

    setJobId(data.job_id)
    setStatus(`Job created. Total rows: ${data.total_rows}`)
  }

  async function processJob() {
    if (!jobId) return
    setError('')
    setStatus('Processing...')

    const res = await fetch(`/api/admin/imports/students/${jobId}/process`, { method: 'POST' })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch {}
    if (!res.ok) return setError(data.error || text || 'Failed to process job')

    setStatus(`Completed. Success: ${data.success_count}, Failed: ${data.failed_count}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <h1 className="text-2xl font-bold text-sky-700 mb-2">Bulk Import: Students (CSV)</h1>
          <p className="text-sm text-gray-600 mb-6">
            Upload a CSV to create an import job, then process it.
          </p>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-sm text-sky-800">
            <div className="font-semibold mb-2">Required headers</div>
            <div className="font-mono text-xs">
              matric_number,surname,other_names,department_code,level,admission_year,full_name
            </div>
            <div className="text-xs mt-2 text-sky-700">
              Note: department_code must match Department Setup codes (not UUID).
            </div>
          </div>

          {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
          {status && <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">{status}</div>}

          <form onSubmit={createJob} className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            <button className="bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded">
              Create Import Job
            </button>
          </form>

          {jobId && (
            <div className="mt-6 p-4 border rounded bg-gray-50">
              <div className="text-sm text-gray-700">
                Job ID created. You can now process it.
              </div>
              <button
                onClick={processJob}
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
              >
                Process Import
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}