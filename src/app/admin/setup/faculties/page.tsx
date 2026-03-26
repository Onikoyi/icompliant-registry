'use client'

import { useEffect, useMemo, useState } from 'react'

type Campus = {
  id: string
  name: string
  code: string
  is_active: boolean
}

type Faculty = {
  id: string
  campus_id: string
  name: string
  code: string
  is_active: boolean
  created_at?: string
  campuses?: Campus | Campus[] | null
}

type FormState = {
  campus_id: string
  name: string
  code: string
  is_active: boolean
}

const emptyForm: FormState = {
  campus_id: '',
  name: '',
  code: '',
  is_active: true,
}

function asErrorMessage(e: any) {
  return e?.message || 'Something went wrong'
}

function getCampusLabel(f: Faculty): string {
  const c = f.campuses
  if (!c) return ''
  if (Array.isArray(c)) return c[0]?.name ? `${c[0].name} (${c[0].code})` : ''
  return c.name ? `${c.name} (${c.code})` : ''
}

export default function FacultiesSetupPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])

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
        setFaculties([])
        setCampuses([])
        return
      }

      const res = await fetch('/api/admin/setup/faculties', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load faculties')

      setFaculties(data.faculties || [])
      // Only show active campuses in dropdown (safe)
      setCampuses((data.campuses || []).filter((c: Campus) => c.is_active !== false))
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

  function loadForEdit(f: Faculty) {
    setEditingId(f.id)
    setForm({
      campus_id: f.campus_id || '',
      name: f.name || '',
      code: f.code || '',
      is_active: f.is_active !== false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.campus_id) return setError('Campus is required')
    if (!form.name.trim()) return setError('Name is required')
    if (!form.code.trim()) return setError('Code is required')

    setSaving(true)
    try {
      const payload = {
        campus_id: form.campus_id,
        name: form.name.trim(),
        code: form.code.trim(),
        is_active: form.is_active,
      }

      const res = await fetch(
        editingId ? `/api/admin/setup/faculties/${editingId}` : '/api/admin/setup/faculties',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save faculty')

      resetForm()
      await fetchData()
    } catch (e: any) {
      setError(asErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(f: Faculty) {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/setup/faculties/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !f.is_active }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update faculty status')

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
            <h1 className="text-2xl font-bold text-sky-700 mb-2">Setup: Faculties</h1>
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
              <h1 className="text-2xl font-bold text-sky-700">Setup: Faculties</h1>
              <p className="text-sm text-gray-600 mt-1">Faculties are linked to campuses.</p>
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
              value={form.campus_id}
              onChange={(e) => setForm((s) => ({ ...s, campus_id: e.target.value }))}
              className="border p-2 rounded col-span-3"
              required
            >
              <option value="">Select Campus...</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Faculty Name (e.g. Faculty of Science)"
              className="border p-2 rounded col-span-2"
              required
            />

            <input
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              placeholder="Code (e.g. SCI)"
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
              {saving ? 'Saving...' : editingId ? 'Update Faculty' : 'Create Faculty'}
            </button>
          </form>

          {/* TABLE */}
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Faculty</th>
                <th className="p-3 border">Campus</th>
                <th className="p-3 border">Code</th>
                <th className="p-3 border">Active</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {faculties.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="p-3 border font-medium">{f.name}</td>
                  <td className="p-3 border text-sm">{getCampusLabel(f) || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3 border text-sm">{f.code}</td>
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
                    <div className="flex gap-2">
                      <button onClick={() => loadForEdit(f)} className="text-sky-700 hover:underline text-sm">
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(f)}
                        className="text-sm text-amber-700 hover:underline"
                        disabled={saving}
                      >
                        {f.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {faculties.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No faculties found.
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