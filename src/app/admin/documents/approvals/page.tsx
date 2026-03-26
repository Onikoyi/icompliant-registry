'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type PendingDoc = {
  id: string
  title: string
  status: 'pending'
  created_at: string
  document_types?: { name: string; owner_type: 'student' | 'staff' | 'both' } | { name: string; owner_type: 'student' | 'staff' | 'both' }[] | null
}

function docTypeName(d: PendingDoc) {
  const dt = d.document_types
  if (!dt) return ''
  if (Array.isArray(dt)) return dt[0]?.name ?? ''
  return dt.name ?? ''
}

export default function ApprovalQueuePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [docs, setDocs] = useState<PendingDoc[]>([])
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)

  const canApprove = useMemo(() => permissions.includes('document.approve'), [permissions])
  const canReject = useMemo(() => permissions.includes('document.reject'), [permissions])
  const canUseQueue = canApprove || canReject

  async function load() {
    setLoading(true)
    setError('')

    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const me = await meRes.json()
      if (!meRes.ok) throw new Error(me.error || 'Failed to load user')

      setPermissions(me.permissions || [])

      if (!((me.permissions || []).includes('document.approve') || (me.permissions || []).includes('document.reject'))) {
        setDocs([])
        return
      }

      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      params.set('limit', '100')

      const res = await fetch(`/api/admin/documents/pending?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load queue')

      setDocs(data.documents || [])
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateStatus(document_id: string, status: 'approved' | 'rejected') {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/documents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      await load()
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-600">Loading approval queue...</div>
  }

  if (!canUseQueue) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          Access denied: you need <b>document.approve</b> or <b>document.reject</b>.
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
              <h1 className="text-2xl font-bold text-sky-700">Approval Queue</h1>
              <p className="text-sm text-gray-600 mt-1">Pending documents awaiting review.</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 items-center mb-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by document title..."
              className="border p-2 rounded flex-1"
            />
            <button onClick={load} className="px-4 py-2 rounded bg-gray-900 text-white">
              Search
            </button>
          </div>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Title</th>
                <th className="p-3 border">Type</th>
                <th className="p-3 border">Submitted</th>
                <th className="p-3 border">Review</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 border font-medium">{d.title}</td>
                  <td className="p-3 border text-sm">{docTypeName(d) || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3 border text-sm">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="p-3 border">
                    <a href={`/admin/documents/${d.id}/review`} className="text-sky-700 hover:underline text-sm">
                      Open
                    </a>
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      {canApprove && (
                        <button
                          disabled={saving}
                          onClick={() => updateStatus(d.id, 'approved')}
                          className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                      )}
                      {canReject && (
                        <button
                          disabled={saving}
                          onClick={() => updateStatus(d.id, 'rejected')}
                          className="text-xs px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No pending documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="text-xs text-gray-500 mt-4">
            Tip: Use “Open” to review versions and workflow history (no UUIDs shown).
          </div>
        </div>
      </div>
    </div>
  )
}