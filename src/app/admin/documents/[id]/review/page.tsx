'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type VersionRow = { id: string; version_number: number; file_path: string; created_at?: string }
type WorkflowRow = { id: string; action: string; created_at: string; users?: { email: string } | { email: string }[] | null; metadata?: any }

type DocDetail = {
  id: string
  title: string
  status: string
  created_at: string
  document_types?: { name: string } | { name: string }[] | null
  document_versions?: VersionRow[]
  document_workflow_logs?: WorkflowRow[]
}

function getIdFromPath(pathname: string): string {
  // /admin/documents/<id>/review
  const parts = pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'documents')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

async function secureView(path: string) {
  const res = await fetch(`/api/documents/view?path=${encodeURIComponent(path)}`)
  const data = await res.json()
  if (data.url) window.open(data.url, '_blank')
  else alert('Unable to open document')
}

function docTypeName(d: DocDetail) {
  const dt = d.document_types
  if (!dt) return ''
  if (Array.isArray(dt)) return dt[0]?.name ?? ''
  return dt.name ?? ''
}

export default function DocumentReviewPage() {
  const router = useRouter()
  const pathname = usePathname()
  const documentId = getIdFromPath(pathname)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [reason, setReason] = useState('')

  const canApprove = useMemo(() => permissions.includes('document.approve'), [permissions])
  const canReject = useMemo(() => permissions.includes('document.reject'), [permissions])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const me = await meRes.json()
      if (!meRes.ok) throw new Error(me.error || 'Failed to load user')
      setPermissions(me.permissions || [])

      // We can reuse DocumentList payload style by fetching owner documents elsewhere,
      // but for demo we’ll call a lightweight endpoint by reusing existing data source:
      const res = await fetch(`/api/admin/documents/${documentId}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load document')
      setDoc(data.document)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (documentId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  async function updateStatus(status: 'approved' | 'rejected') {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/documents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, status, reason: reason.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      router.push('/admin/documents/approvals')
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-600">Loading document...</div>

  if (!doc) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          Document not found.
        </div>
      </div>
    )
  }

  const versions = doc.document_versions || []
  const latest = versions[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-sky-700">Document Review</h1>
              <p className="text-sm text-gray-600 mt-1">
                {docTypeName(doc) ? `${docTypeName(doc)} — ` : ''}{doc.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Submitted: {new Date(doc.created_at).toLocaleString()} • Status: {doc.status.toUpperCase()}
              </p>
            </div>
            <a href="/admin/documents/approvals" className="text-sm text-sky-700 hover:underline">
              ← Back to Queue
            </a>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 items-center mb-6">
            {latest ? (
              <button
                onClick={() => secureView(latest.file_path)}
                className="px-4 py-2 rounded bg-gray-900 text-white"
              >
                View Latest File
              </button>
            ) : (
              <span className="text-gray-500 text-sm">No file versions found.</span>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded p-2"
              rows={3}
              placeholder="Add an approval/rejection note for audit trail..."
            />
          </div>

          <div className="flex gap-2 mb-10">
            {canApprove && (
              <button
                disabled={saving}
                onClick={() => updateStatus('approved')}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                Approve
              </button>
            )}
            {canReject && (
              <button
                disabled={saving}
                onClick={() => updateStatus('rejected')}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Versions</h2>
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border rounded p-3">
                    <div className="text-sm">
                      Version {v.version_number}
                      {v.created_at ? <span className="text-xs text-gray-500"> • {new Date(v.created_at).toLocaleString()}</span> : null}
                    </div>
                    <button onClick={() => secureView(v.file_path)} className="text-sm text-sky-700 hover:underline">
                      View
                    </button>
                  </div>
                ))}
                {versions.length === 0 && <div className="text-sm text-gray-500">No versions.</div>}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Workflow History</h2>
              <div className="space-y-2">
                {(doc.document_workflow_logs || []).map((log) => {
                  const u = log.users
                  const email = Array.isArray(u) ? u[0]?.email : u?.email
                  const note = log.metadata?.reason ? ` — ${log.metadata.reason}` : ''
                  return (
                    <div key={log.id} className="text-sm border rounded p-3 flex justify-between gap-4">
                      <div>
                        <div className="font-medium">{String(log.action).toUpperCase()}{note}</div>
                        <div className="text-xs text-gray-500">{email || 'System'}</div>
                      </div>
                      <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
                {(doc.document_workflow_logs || []).length === 0 && <div className="text-sm text-gray-500">No workflow logs.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}