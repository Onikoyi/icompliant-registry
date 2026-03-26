'use client'

import { useEffect, useMemo, useState } from 'react'

type Department = { id: string; name: string; code: string; is_active?: boolean }

type FileRow = {
  id: string
  reference_code: string
  title: string
  description: string | null
  owner_kind: 'general' | 'department' | 'student' | 'staff'
  owner_id: string | null
  department_id: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  departments?: Department | Department[] | null
}

type FormState = {
  reference_code: string
  title: string
  description: string
  owner_kind: 'general' | 'department' | 'student' | 'staff'
  owner_id: string
  department_id: string
  is_active: boolean
}

const emptyForm: FormState = {
  reference_code: '',
  title: '',
  description: '',
  owner_kind: 'general',
  owner_id: '',
  department_id: '',
  is_active: true,
}

function deptLabel(f: FileRow) {
  const d = f.departments
  if (!d) return ''
  if (Array.isArray(d)) return d[0]?.name ? `${d[0].name} (${d[0].code})` : ''
  return d.name ? `${d.name} (${d.code})` : ''
}

export default function FilesRegistryPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const [files, setFiles] = useState<FileRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [form, setForm] = useState<FormState>(emptyForm)

  const canView = useMemo(() => permissions.includes('file.view') || permissions.includes('file.manage'), [permissions])
  const canManage = useMemo(() => permissions.includes('file.manage'), [permissions])

  async function fetchMe() {
    const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
    const meData = await meRes.json()
    if (!meRes.ok) throw new Error(meData.error || 'Failed to load current user')
    setPermissions(meData.permissions || [])
    return meData.permissions || []
  }

  async function fetchFiles() {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (activeFilter === 'active') params.set('active', 'true')
    if (activeFilter === 'inactive') params.set('active', 'false')

    const res = await fetch(`/api/admin/files?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load files')

    setFiles(data.files || [])

    // Departments for dropdown (active only)
    const deps = (data.departments || []) as Department[]
    setDepartments(deps.filter((d) => d.is_active !== false))
  }

  async function init() {
    setLoading(true)
    setError('')
    try {
      const perms = await fetchMe()
      if (!perms.includes('file.view') && !perms.includes('file.manage')) {
        setFiles([])
        return
      }
      await fetchFiles()
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

  async function runSearch() {
    setError('')
    setLoading(true)
    try {
      await fetchFiles()
    } catch (e: any) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function createFile(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!canManage) {
      setError('You do not have permission to create files.')
      return
    }

    if (!form.reference_code.trim()) return setError('Reference code is required')
    if (!form.title.trim()) return setError('Title is required')

    setSaving(true)
    try {
      const payload = {
        reference_code: form.reference_code.trim(),
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        owner_kind: form.owner_kind,
        owner_id: form.owner_id.trim() ? form.owner_id.trim() : null,

        // ✅ department_id comes from dropdown; empty = null
        department_id: form.department_id ? form.department_id : null,

        is_active: form.is_active,
      }

      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create file')

      setForm(emptyForm)
      await fetchFiles()
    } catch (e: any) {
      setError(e.message || 'Failed to create file')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-2">Files Registry</h1>
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
            <p className="text-gray-700">You do not have permission to view registry files.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-sky-700">Files Registry</h1>
            <p className="text-sm text-gray-600 mt-1">
              Registry “covers/folders” that contain many documents (e.g., Matters Affecting Sports).
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {/* Create form */}
          <form onSubmit={createFile} className="grid grid-cols-3 gap-4 mb-8">
            <input
              value={form.reference_code}
              onChange={(e) => setForm((s) => ({ ...s, reference_code: e.target.value }))}
              placeholder="Reference Code (e.g. REG/SPORTS/2026/001)"
              className="border p-2 rounded col-span-1"
              disabled={!canManage || saving}
              required
            />
            <input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="File Title (e.g. Matters Affecting Sports)"
              className="border p-2 rounded col-span-2"
              disabled={!canManage || saving}
              required
            />
            <input
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description (optional)"
              className="border p-2 rounded col-span-3"
              disabled={!canManage || saving}
            />

            <select
              value={form.owner_kind}
              onChange={(e) => setForm((s) => ({ ...s, owner_kind: e.target.value as any }))}
              className="border p-2 rounded col-span-1"
              disabled={!canManage || saving}
            >
              <option value="general">General</option>
              <option value="department">Department</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>

            <input
              value={form.owner_id}
              onChange={(e) => setForm((s) => ({ ...s, owner_id: e.target.value }))}
              placeholder="Owner ID (optional UUID) — will be improved later"
              className="border p-2 rounded col-span-1"
              disabled={!canManage || saving}
            />

            {/* ✅ Department dropdown */}
            <select
              value={form.department_id}
              onChange={(e) => setForm((s) => ({ ...s, department_id: e.target.value }))}
              className="border p-2 rounded col-span-1"
              disabled={!canManage || saving}
            >
              <option value="">No Department (Global)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded col-span-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                disabled={!canManage || saving}
              />
              Active
            </label>

            <button
              type="submit"
              disabled={!canManage || saving}
              className="col-span-3 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white py-2 rounded"
            >
              {saving ? 'Saving...' : 'Create File'}
            </button>
          </form>

          {/* Search */}
          <div className="flex gap-3 items-center mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by reference code or title..."
              className="border p-2 rounded flex-1"
            />
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="border p-2 rounded"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={runSearch} className="px-4 py-2 rounded bg-gray-900 text-white">
              Search
            </button>
          </div>

          {/* Table */}
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Reference</th>
                <th className="p-3 border">Title</th>
                <th className="p-3 border">Owner Kind</th>
                <th className="p-3 border">Department</th>
                <th className="p-3 border">Active</th>
                <th className="p-3 border">Open</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="p-3 border font-mono text-sm">{f.reference_code}</td>
                  <td className="p-3 border">
                    <div className="font-medium">{f.title}</div>
                    {f.description ? <div className="text-xs text-gray-500 mt-1">{f.description}</div> : null}
                  </td>
                  <td className="p-3 border text-sm">{f.owner_kind}</td>
                  <td className="p-3 border text-sm">{deptLabel(f) || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3 border text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {f.id ? (
                      <a href={`/admin/files/${f.id}`} className="text-sky-700 hover:underline text-sm">
                        Open
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="text-xs text-gray-500 mt-4">
            Tip: Use “Open” to manage document assignments inside the file.
          </div>
        </div>
      </div>
    </div>
  )
}