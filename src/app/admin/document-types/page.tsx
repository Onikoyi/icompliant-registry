'use client'

import { useEffect, useMemo, useState } from 'react'

type Department = {
  id: string
  name: string
  code: string
}

type DocumentTypeRow = {
  id: string
  name: string
  purpose: string | null
  owner_type: 'student' | 'staff' | 'both'
  requires_approval: boolean
  is_mandatory: boolean
  expiry_required: boolean
  expiry_days: number | null
  is_active: boolean
  department_id: string | null
  departments?: Department | Department[] | null
  created_at?: string
  updated_at?: string
}

type FormState = {
  name: string
  purpose: string
  applies_to: 'student' | 'staff' | 'both'
  department_id: string
  requires_approval: boolean
  is_mandatory: boolean
  expiry_required: boolean
  expiry_days: string
  is_active: boolean
}

const emptyForm: FormState = {
  name: '',
  purpose: '',
  applies_to: 'both',
  department_id: '',
  requires_approval: false,
  is_mandatory: false,
  expiry_required: false,
  expiry_days: '',
  is_active: true,
}

function getDepartmentName(dt: DocumentTypeRow): string {
  const dep = dt.departments
  if (!dep) return ''
  if (Array.isArray(dep)) return dep[0]?.name ?? ''
  return dep.name ?? ''
}

export default function DocumentTypesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const canManage = useMemo(() => permissions.includes('document_type.manage'), [permissions])

  async function fetchData() {
    setLoading(true)
    setError('')

    try {
      const [meRes, dtRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/admin/document-types', { cache: 'no-store' }),
      ])

      const meData = await meRes.json()
      if (!meRes.ok) {
        throw new Error(meData.error || 'Failed to load current user')
      }

      setPermissions(meData.permissions || [])

      // If user cannot manage, don't even call admin endpoint repeatedly
      if (!(meData.permissions || []).includes('document_type.manage')) {
        setDocumentTypes([])
        setDepartments([])
        return
      }

      const dtData = await dtRes.json()
      if (!dtRes.ok) {
        throw new Error(dtData.error || 'Failed to load document types')
      }

      setDocumentTypes(dtData.documentTypes || [])
      setDepartments(dtData.departments || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function loadForEdit(row: DocumentTypeRow) {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      purpose: row.purpose || '',
      applies_to: row.owner_type || 'both',
      department_id: row.department_id || '',
      requires_approval: !!row.requires_approval,
      is_mandatory: !!row.is_mandatory,
      expiry_required: !!row.expiry_required,
      expiry_days: row.expiry_days ? String(row.expiry_days) : '',
      is_active: row.is_active !== false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateClient(state: FormState): string | null {
    if (!state.name.trim()) return 'Name is required'
    if (!['student', 'staff', 'both'].includes(state.applies_to)) return 'Invalid Applies To'

    if (!state.expiry_required) {
      return null
    }

    const n = Number(state.expiry_days)
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      return 'Expiry days must be a positive integer when expiry is required'
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validation = validateClient(form)
    if (validation) {
      setError(validation)
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        purpose: form.purpose.trim() ? form.purpose.trim() : null,
        applies_to: form.applies_to,
        department_id: form.department_id ? form.department_id : null,
        requires_approval: form.requires_approval,
        is_mandatory: form.is_mandatory,
        expiry_required: form.expiry_required,
        expiry_days: form.expiry_required ? Number(form.expiry_days) : null,
        is_active: form.is_active,
      }

      const isEditing = Boolean(editingId)

      if (editingId && typeof editingId !== 'string') {
        setError('Invalid document type id')
        return
      }
      if (editingId === 'undefined' || editingId === 'null') {
        setError('Cannot update: invalid document type id')
        return
      }

      const res = await fetch(
        editingId ? `/api/admin/document-types/${editingId}` : '/api/admin/document-types',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save document type')
      }

      resetForm()
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row: DocumentTypeRow) {
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/document-types/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !row.is_active }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-4">Document Types</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-3">Access Denied</h1>
            <p className="text-gray-700">
              You do not have permission to manage document types.
            </p>
          </div>
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
              <h1 className="text-2xl font-bold text-sky-700">Document Types</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure document definitions (student/staff/both), approval triggers, expiry rules, and departmental ownership.
              </p>
            </div>

            {editingId && (
              <button
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mb-8">
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name (e.g. Admission Letter)"
              className="border p-2 rounded col-span-2"
              required
            />

            <select
              value={form.applies_to}
              onChange={(e) =>
                setForm((s) => ({ ...s, applies_to: e.target.value as any }))
              }
              className="border p-2 rounded"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="both">Both</option>
            </select>

            <input
              value={form.purpose}
              onChange={(e) => setForm((s) => ({ ...s, purpose: e.target.value }))}
              placeholder="Purpose / Description (optional)"
              className="border p-2 rounded col-span-3"
            />

            <select
              value={form.department_id}
              onChange={(e) => setForm((s) => ({ ...s, department_id: e.target.value }))}
              className="border p-2 rounded col-span-2"
            >
              <option value="">No Department (Global)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
              />
              Active
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded">
              <input
                type="checkbox"
                checked={form.requires_approval}
                onChange={(e) =>
                  setForm((s) => ({ ...s, requires_approval: e.target.checked }))
                }
              />
              Requires Approval
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded">
              <input
                type="checkbox"
                checked={form.is_mandatory}
                onChange={(e) => setForm((s) => ({ ...s, is_mandatory: e.target.checked }))}
              />
              Mandatory
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded">
              <input
                type="checkbox"
                checked={form.expiry_required}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    expiry_required: e.target.checked,
                    expiry_days: e.target.checked ? s.expiry_days : '',
                  }))
                }
              />
              Expiry Required
            </label>

            <input
              value={form.expiry_days}
              onChange={(e) => setForm((s) => ({ ...s, expiry_days: e.target.value }))}
              placeholder="Expiry Days (e.g. 365)"
              className="border p-2 rounded col-span-3"
              disabled={!form.expiry_required}
            />

            <button
              type="submit"
              disabled={saving}
              className="col-span-3 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white py-2 rounded"
            >
              {saving ? 'Saving...' : editingId ? 'Update Document Type' : 'Create Document Type'}
            </button>
          </form>

          {/* TABLE */}
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Applies To</th>
                <th className="p-3 border">Department</th>
                <th className="p-3 border">Approval</th>
                <th className="p-3 border">Mandatory</th>
                <th className="p-3 border">Expiry</th>
                <th className="p-3 border">Active</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {documentTypes.map((dt) => (
                <tr key={dt.id} className="hover:bg-gray-50">
                  <td className="p-3 border">
                    <div className="font-medium text-gray-900">{dt.name}</div>
                    {dt.purpose ? (
                      <div className="text-xs text-gray-500 mt-1">{dt.purpose}</div>
                    ) : null}
                  </td>

                  <td className="p-3 border text-sm">{dt.owner_type}</td>

                  <td className="p-3 border text-sm">
                    {getDepartmentName(dt) || <span className="text-gray-400">—</span>}
                  </td>

                  <td className="p-3 border text-sm">
                    {dt.requires_approval ? 'Yes' : 'No'}
                  </td>

                  <td className="p-3 border text-sm">{dt.is_mandatory ? 'Yes' : 'No'}</td>

                  <td className="p-3 border text-sm">
                    {dt.expiry_required ? `${dt.expiry_days} days` : 'No'}
                  </td>

                  <td className="p-3 border text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        dt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {dt.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>

                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadForEdit(dt)}
                        className="text-sky-700 hover:underline text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleActive(dt)}
                        className="text-sm text-amber-700 hover:underline"
                        disabled={saving}
                      >
                        {dt.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {documentTypes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No document types found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}