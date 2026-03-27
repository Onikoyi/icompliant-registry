'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type Job = {
  id: string
  type: string
  status: string
  summary: any
  created_at: string
  updated_at: string
}

type ErrorRow = {
  id: string
  row_number: number
  error_message: string | null
  payload: any
  updated_at: string
}

function getJobIdFromPath(pathname: string): string {
  // /admin/imports/<job_id>
  const parts = pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'imports')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export default function ImportJobDetailPage() {
  const pathname = usePathname()
  const jobId = getJobIdFromPath(pathname)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [errors, setErrors] = useState<ErrorRow[]>([])

  const canManage = useMemo(() => permissions.includes('import.manage'), [permissions])

  async function init() {
    setLoading(true)
    setError('')
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const me = await meRes.json()
      if (!meRes.ok) throw new Error(me.error || 'Failed to load user')
      setPermissions(me.permissions || [])

      if (!(me.permissions || []).includes('import.manage')) return

      const res = await fetch(`/api/admin/imports/${jobId}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load job')

      setJob(data.job)
      setErrors(data.errors || [])
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (jobId) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  async function rerunProcess() {
    if (!job) return
    setError('')
    try {
      const endpoint =
        job.type === 'students_csv'
          ? `/api/admin/imports/students/${job.id}/process`
          : job.type === 'staff_csv'
            ? `/api/admin/imports/staff/${job.id}/process`
            : null

      if (!endpoint) {
        setError('This job type does not support processing here.')
        return
      }

      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to re-process job')

      await init()
    } catch (e: any) {
      setError(e.message || 'Failed to re-process')
    }
  }

  if (loading) return <div className="p-8 text-gray-600">Loading job...</div>

  if (!canManage) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          Access denied: missing <b>import.manage</b>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">Job not found.</div>
      </div>
    )
  }

  const s = job.summary || {}
  const total = s.total ?? s.total_rows ?? 0
  const success = s.success ?? 0
  const failed = s.failed ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-sky-700">Import Job Details</h1>
              <p className="text-sm text-gray-600 mt-1">
                Type: <b>{job.type}</b> • Status: <b>{job.status}</b>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Created: {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
            <a href="/admin/imports" className="text-sm text-sky-700 hover:underline">
              ← Back to Imports
            </a>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="text-sm text-emerald-800">Total</div>
              <div className="text-2xl font-bold text-emerald-900">{total}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-6">
              <div className="text-sm text-sky-800">Success</div>
              <div className="text-2xl font-bold text-sky-900">{success}</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <div className="text-sm text-red-800">Failed</div>
              <div className="text-2xl font-bold text-red-900">{failed}</div>
            </div>
          </div>

          <button
            onClick={rerunProcess}
            className="mb-8 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
          >
            Re-run Processing
          </button>

          <h2 className="text-lg font-semibold text-gray-900 mb-3">Error Rows</h2>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Row</th>
                <th className="p-3 border">Error</th>
                <th className="p-3 border">Payload (preview)</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-3 border text-sm">{r.row_number}</td>
                  <td className="p-3 border text-sm text-red-700">{r.error_message || '—'}</td>
                  <td className="p-3 border text-xs text-gray-700">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(r.payload, null, 2)}</pre>
                  </td>
                </tr>
              ))}
              {errors.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">
                    No error rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="text-xs text-gray-500 mt-4">
            Note: For large imports we’ll paginate and support CSV error export later. For demo, this is perfect.
          </div>
        </div>
      </div>
    </div>
  )
}