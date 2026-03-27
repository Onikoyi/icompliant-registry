'use client'

import { useEffect, useMemo, useState } from 'react'

type ImportJob = {
  id: string
  type: string
  status: string
  summary: any
  created_at: string
  updated_at: string
}

function safeNum(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function ImportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const canManage = useMemo(() => permissions.includes('import.manage'), [permissions])

  async function fetchMe() {
    const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
    const meData = await meRes.json()
    if (!meRes.ok) throw new Error(meData.error || 'Failed to load current user')
    setPermissions(meData.permissions || [])
    return meData.permissions || []
  }

  async function fetchJobs() {
    const p = new URLSearchParams()
    if (typeFilter !== 'all') p.set('type', typeFilter)
    if (statusFilter !== 'all') p.set('status', statusFilter)
    p.set('limit', '100')

    const res = await fetch(`/api/admin/imports?${p.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load import jobs')
    setJobs(data.jobs || [])
  }

  async function init() {
    setLoading(true)
    setError('')
    try {
      const perms = await fetchMe()
      if (!perms.includes('import.manage')) {
        setJobs([])
        return
      }
      await fetchJobs()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function applyFilters() {
    setLoading(true)
    setError('')
    try {
      await fetchJobs()
    } catch (e: any) {
      setError(e.message || 'Failed to reload')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-600">Loading imports...</div>

  if (!canManage) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          Access denied: missing <b>import.manage</b>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-sky-700">Imports</h1>
              <p className="text-sm text-gray-600 mt-1">Job history, status, counts, and error rows.</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-6">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border p-2 rounded">
              <option value="all">All Types</option>
              <option value="students_csv">Students CSV</option>
              <option value="staff_csv">Staff CSV</option>
              <option value="api_ingest">API Ingest</option>
              <option value="files_csv">files_csv</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border p-2 rounded">
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <button onClick={applyFilters} className="px-4 py-2 rounded bg-gray-900 text-white">
              Apply
            </button>

            <div className="text-xs text-gray-500">
              Tip: Use Student Import / Staff Import pages to create jobs, then check results here.
            </div>
          </div>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Type</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Counts</th>
                <th className="p-3 border">Created</th>
                <th className="p-3 border">Details</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const s = j.summary || {}
                const total = safeNum(s.total || s.total_rows)
                const success = safeNum(s.success)
                const failed = safeNum(s.failed)

                return (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="p-3 border text-sm">{j.type}</td>
                    <td className="p-3 border text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          j.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : j.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : j.status === 'processing'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {j.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 border text-sm">
                      <div>Total: {total}</div>
                      <div>Success: {success}</div>
                      <div>Failed: {failed}</div>
                    </td>
                    <td className="p-3 border text-sm">{new Date(j.created_at).toLocaleString()}</td>
                    <td className="p-3 border">
                      <a href={`/admin/imports/${j.id}`} className="text-sky-700 hover:underline text-sm">
                        View
                      </a>
                    </td>
                  </tr>
                )
              })}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No import jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}