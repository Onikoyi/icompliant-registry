'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type DocTypeOption = { id: string; name: string }
type DocType = { id: string; name: string; owner_type: 'student' | 'staff' | 'both' }

type DocVersion = {
  id: string
  file_path: string
  version_number: number
  created_at?: string
}

type DocumentRow = {
  id: string
  owner_id: string | null
  document_type_id: string
  title: string
  status: string
  source: string
  file_id: string | null
  created_at?: string
  document_types?: DocType | DocType[] | null
  document_versions?: DocVersion[] | null
}

function docTypeName(d: DocumentRow) {
  const dt = d.document_types
  if (!dt) return ''
  if (Array.isArray(dt)) return dt[0]?.name ?? ''
  return dt.name ?? ''
}

function latestPath(d: DocumentRow): string | null {
  const versions = d.document_versions || []
  return versions.length ? versions[0].file_path : null
}

function safeFileIdFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'files')
  const id = idx >= 0 ? parts[idx + 1] : ''
  return String(id ?? '').trim()
}

// Uses your existing signed-url endpoint
async function getSignedUrl(path: string): Promise<string> {
  const res = await fetch(`/api/documents/view?path=${encodeURIComponent(path)}`)
  const text = await res.text()
  let data: any = {}
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text || 'Failed to retrieve document URL')
  }
  if (!res.ok) throw new Error(data.error || 'Failed to retrieve document URL')
  if (!data.url) throw new Error('No URL returned')
  return data.url
}

export default function FileDetailPage() {
  const pathname = usePathname()
  const fileId = safeFileIdFromPath(pathname)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [fileMeta, setFileMeta] = useState<{ reference_code: string; title: string } | null>(null)

  const canView = useMemo(
    () => permissions.includes('file.view') || permissions.includes('file.manage'),
    [permissions]
  )
  const canManage = useMemo(() => permissions.includes('file.manage'), [permissions])

  const [inFile, setInFile] = useState<DocumentRow[]>([])
  const [unassigned, setUnassigned] = useState<DocumentRow[]>([])
  const [q, setQ] = useState('')

  // Upload-into-file state
  const [docTypes, setDocTypes] = useState<DocTypeOption[]>([])
  const [uploadTypeId, setUploadTypeId] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function fetchMe() {
    const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
    const meData = await meRes.json()
    if (!meRes.ok) throw new Error(meData.error || 'Failed to load current user')
    setPermissions(meData.permissions || [])
    return meData.permissions || []
  }

  async function fetchFileMeta() {
    const res = await fetch(`/api/admin/files/${fileId}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load file')
    setFileMeta({ reference_code: data.file.reference_code, title: data.file.title })
  }

  async function fetchDocTypes() {
    const res = await fetch('/api/admin/document-types/active', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load document types')
    setDocTypes(data.documentTypes || [])
  }

  async function fetchDocs(includeUnassigned: boolean) {
    const p = new URLSearchParams()
    p.set('include_unassigned', includeUnassigned ? 'true' : 'false')
    if (q.trim()) p.set('q', q.trim())
    p.set('limit', '100')

    const res = await fetch(`/api/admin/files/${fileId}/documents?${p.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load file documents')

    setInFile(data.inFile || [])
    setUnassigned(data.unassigned || [])
  }

  async function init() {
    setLoading(true)
    setError('')
    try {
      const perms = await fetchMe()
      if (!perms.includes('file.view') && !perms.includes('file.manage')) {
        setInFile([])
        setUnassigned([])
        return
      }

      await fetchFileMeta()
      await fetchDocs(true)

      if (perms.includes('file.manage')) {
        await fetchDocTypes()
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!fileId) return
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  async function runSearch() {
    setError('')
    setLoading(true)
    try {
      await fetchDocs(true)
    } catch (e: any) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function assignDocument(document_id: string) {
    if (!canManage) return setError('You do not have permission to assign documents.')
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/files/${fileId}/assign-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign document')
      await fetchDocs(true)
    } catch (e: any) {
      setError(e.message || 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  async function unassignDocument(document_id: string) {
    if (!canManage) return setError('You do not have permission to unassign documents.')
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/files/${fileId}/unassign-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to unassign document')
      await fetchDocs(true)
    } catch (e: any) {
      setError(e.message || 'Failed to unassign')
    } finally {
      setSaving(false)
    }
  }

  async function uploadIntoFile(e: React.FormEvent) {
    e.preventDefault()
    setUploadError(null)

    if (!canManage) return setUploadError('You do not have permission to upload into files.')
    if (!uploadTypeId) return setUploadError('Please select a document type.')
    if (!uploadFile) return setUploadError('Please select a file to upload.')
    if (uploadFile.size > 5 * 1024 * 1024) return setUploadError('File size must not exceed 5MB.')

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('file_id', fileId)
      fd.append('document_type_id', uploadTypeId)
      fd.append('source', 'file_upload')

      const res = await fetch('/api/documents/upload-to-file', { method: 'POST', body: fd })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(data.error || text || 'Upload failed')

      setUploadFile(null)
      setUploadTypeId('')
      await fetchDocs(true)
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  async function viewDoc(d: DocumentRow) {
    setError('')
    try {
      const path = latestPath(d)
      if (!path) return setError('No file version found for this document.')
      const url = await getSignedUrl(path)
      window.open(url, '_blank')
    } catch (e: any) {
      setError(e.message || 'Failed to open document')
    }
  }

  async function downloadDoc(d: DocumentRow) {
    setError('')
    try {
      const path = latestPath(d)
      if (!path) return setError('No file version found for this document.')
      const url = await getSignedUrl(path)

      const a = document.createElement('a')
      a.href = url
      // download attribute may or may not force download depending on browser/CORS,
      // but it gives the expected behavior for most cases.
      a.download = d.title || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      setError(e.message || 'Failed to download document')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-2">File</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-3">Access Denied</h1>
            <p className="text-gray-700">You do not have permission to view file documents.</p>
          </div>
        </div>
      </div>
    )
  }

  const fileTitle = fileMeta?.title || 'This File'
  const fileHeader = fileMeta ? `${fileMeta.reference_code} — ${fileMeta.title}` : 'File Documents'

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-sky-700">{fileHeader}</h1>
              <p className="text-sm text-gray-600 mt-1">
                View, download, upload into this file cover, or assign existing documents.
              </p>
            </div>
            <a href="/admin/files" className="text-sm text-sky-700 hover:underline">
              ← Back to Files
            </a>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {canManage && (
            <div className="mb-10 border border-sky-200 bg-sky-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-sky-700 mb-3">Upload into “{fileTitle}”</h2>

              {uploadError && (
                <div className="mb-4 bg-red-100 text-red-700 p-2 rounded text-sm">{uploadError}</div>
              )}

              <form onSubmit={uploadIntoFile} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={uploadTypeId}
                  onChange={(e) => setUploadTypeId(e.target.value)}
                  className="border p-2 rounded"
                  required
                >
                  <option value="">Select Document Type</option>
                  {docTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="border p-2 rounded"
                  required
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  {saving ? 'Uploading...' : 'Upload to File'}
                </button>
              </form>
            </div>
          )}

          <div className="flex gap-3 items-center mb-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or status..."
              className="border p-2 rounded flex-1"
            />
            <button onClick={runSearch} className="px-4 py-2 rounded bg-gray-900 text-white">
              Search
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Documents in “{fileTitle}”</h2>

            <table className="w-full border border-gray-200">
              <thead>
                <tr className="bg-sky-50 text-left">
                  <th className="p-3 border">Title</th>
                  <th className="p-3 border">Type</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Actions</th>
                  <th className="p-3 border">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {inFile.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-3 border">
                      <div className="font-medium">{d.title}</div>
                    </td>
                    <td className="p-3 border text-sm">{docTypeName(d) || <span className="text-gray-400">—</span>}</td>
                    <td className="p-3 border text-sm">{d.status}</td>
                    <td className="p-3 border">
                      <div className="flex gap-3">
                        <button onClick={() => viewDoc(d)} className="text-sm text-sky-700 hover:underline">
                          View
                        </button>
                        <button onClick={() => downloadDoc(d)} className="text-sm text-gray-700 hover:underline">
                          Download
                        </button>
                      </div>
                    </td>
                    <td className="p-3 border">
                      <button
                        onClick={() => unassignDocument(d.id)}
                        disabled={!canManage || saving}
                        className="text-sm text-amber-700 hover:underline disabled:opacity-60"
                      >
                        Unassign
                      </button>
                    </td>
                  </tr>
                ))}
                {inFile.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      No documents assigned to this file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Unassigned Documents (Available to Add)</h2>

            <table className="w-full border border-gray-200">
              <thead>
                <tr className="bg-sky-50 text-left">
                  <th className="p-3 border">Title</th>
                  <th className="p-3 border">Type</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Actions</th>
                  <th className="p-3 border">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-3 border">
                      <div className="font-medium">{d.title}</div>
                    </td>
                    <td className="p-3 border text-sm">{docTypeName(d) || <span className="text-gray-400">—</span>}</td>
                    <td className="p-3 border text-sm">{d.status}</td>
                    <td className="p-3 border">
                      <div className="flex gap-3">
                        <button onClick={() => viewDoc(d)} className="text-sm text-sky-700 hover:underline">
                          View
                        </button>
                        <button onClick={() => downloadDoc(d)} className="text-sm text-gray-700 hover:underline">
                          Download
                        </button>
                      </div>
                    </td>
                    <td className="p-3 border">
                      <button
                        onClick={() => assignDocument(d.id)}
                        disabled={!canManage || saving}
                        className="text-sm text-sky-700 hover:underline disabled:opacity-60"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
                {unassigned.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      No unassigned documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="text-xs text-gray-500 mt-3">
              Note: this view shows unassigned documents only (documents not already inside another file).
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}