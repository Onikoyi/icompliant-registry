'use client'

import { useEffect, useMemo, useState } from 'react'

type Faculty = {
  id: string
  campus_id: string
  name: string
  code: string
  is_active: boolean
}

type Department = {
  id: string
  faculty_id: string
  name: string
  code: string
  is_active: boolean
  created_at?: string
  faculties?: Faculty | Faculty[] | null
}

type FormState = {
  faculty_id: string
  name: string
  code: string
  is_active: boolean
}

const emptyForm: FormState = {
  faculty_id: '',
  name: '',
  code: '',
  is_active: true,
}

function asErrorMessage(e: any) {
  return e?.message || 'Something went wrong'
}

function getFacultyLabel(d: Department): string {
  const f = d.faculties
  if (!f) return ''
  if (Array.isArray(f)) return f[0]?.name ? `${f[0].name} (${f[0].code})` : ''
  return f.name ? `${f.name} (${f.code})` : ''
}

export default function DepartmentsSetupPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const [departments, setDepartments] = useState<Department[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const canManage = useMemo(() => permissions.includes('org.manage'), [permissions])

  async function fetchData() {
    setLoading(true)
    setError('')

    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const meData = await meRes.json()
      if (!meRes.ok) throw new Error(meData.error || 'Failed to load current user')
      setPermissions(meData.permissions || [])

      if (!(meData.permissions || []).includes('org.manage')) {
        setDepartments([])
        setFaculties([])
        return
      }

      const res = await fetch('/api/admin/setup/departments', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load departments')

      setDepartments(data.departments || [])
      // Only show active faculties in dropdown (safe)
      setFaculties((data.faculties || []).filter((f: Faculty) => f.is_active !== false))
    } catch (e: any) {
      setError(asErrorMessage(e))
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

  function loadForEdit(d: Department) {
    setEditingId(d.id)
    setForm({
      faculty_id: d.faculty_id || '',
      name: d.name || '',
      code: d.code || '',
      is_active: d.is_active !== false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.faculty_id) return setError('Faculty is required')
    if (!form.name.trim()) return setError('Name is required')
    if (!form.code.trim()) return setError('Code is required')

    setSaving(true)
    try {
      const payload = {
        faculty_id: form.faculty_id,
        name: form.name.trim(),
        code: form.code.trim(),
        is_active: form.is_active,
      }

      const res = await fetch(
        editingId ? `/api/admin/setup/departments/${editingId}` : '/api/admin/setup/departments',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save department')

      resetForm()
      await fetchData()
    } catch (e: any) {
      setError(asErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(d: Department) {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/setup/departments/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !d.is_active }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update department status')

      await fetchData()
    } catch (e: any) {
      setError(asErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-2">Setup: Departments</h1>
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
            <p className="text-gray-700">You do not have permission to manage the organization setup.</p>
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
              <h1 className="text-2xl font-bold text-sky-700">Setup: Departments</h1>
              <p className="text-sm text-gray-600 mt-1">Departments are linked to faculties.</p>
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
            <select
              value={form.faculty_id}
              onChange={(e) => setForm((s) => ({ ...s, faculty_id: e.target.value }))}
              className="border p-2 rounded col-span-3"
              required
            >
              <option value="">Select Faculty...</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>

            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Department Name (e.g. Computer Science)"
              className="border p-2 rounded col-span-2"
              required
            />

            <input
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              placeholder="Code (e.g. CSC)"
              className="border p-2 rounded"
              required
            />

            <label className="flex items-center gap-2 text-sm text-gray-700 border p-2 rounded col-span-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
              />
              Active
            </label>

            <button
              type="submit"
              disabled={saving}
              className="col-span-3 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white py-2 rounded"
            >
              {saving ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
            </button>
          </form>

          {/* TABLE */}
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Department</th>
                <th className="p-3 border">Faculty</th>
                <th className="p-3 border">Code</th>
                <th className="p-3 border">Active</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 border font-medium">{d.name}</td>
                  <td className="p-3 border text-sm">{getFacultyLabel(d) || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3 border text-sm">{d.code}</td>
                  <td className="p-3 border text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {d.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button onClick={() => loadForEdit(d)} className="text-sky-700 hover:underline text-sm">
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(d)}
                        className="text-sm text-amber-700 hover:underline"
                        disabled={saving}
                      >
                        {d.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {departments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No departments found.
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