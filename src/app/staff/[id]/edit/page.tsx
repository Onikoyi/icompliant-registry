'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type StaffPayload = {
  staff: {
    id: string
    staff_number: string
    employment_type: string | null
    role_title: string | null
    employment_status: string | null
  }
  owner: {
    id: string
    full_name: string | null
    surname: string | null
    other_names: string | null
    owner_key: string | null
  }
}

function getIdFromPath(pathname: string): string {
  // /staff/<id>/edit
  const parts = pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'staff')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export default function StaffEditPage() {
  const pathname = usePathname()
  const staffId = getIdFromPath(pathname)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const canUpdate = useMemo(() => permissions.includes('staff.update'), [permissions])

  const [form, setForm] = useState({
    staff_number: '',
    employment_type: '',
    role_title: '',
    employment_status: '',
    full_name: '',
    surname: '',
    other_names: '',
  })

  async function init() {
    setLoading(true)
    setError('')
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      const meData = await meRes.json()
      if (!meRes.ok) throw new Error(meData.error || 'Failed to load current user')
      setPermissions(meData.permissions || [])

      if (!(meData.permissions || []).includes('staff.update')) return

      const res = await fetch(`/api/staff/${staffId}`, { cache: 'no-store' })
      const data = (await res.json()) as StaffPayload
      if (!res.ok) throw new Error((data as any).error || 'Failed to load staff')

      setForm({
        staff_number: data.staff.staff_number || '',
        employment_type: data.staff.employment_type || '',
        role_title: data.staff.role_title || '',
        employment_status: data.staff.employment_status || '',
        full_name: data.owner.full_name || '',
        surname: data.owner.surname || '',
        other_names: data.owner.other_names || '',
      })
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (staffId) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!canUpdate) return setError('You do not have permission to update staff.')

    if (!form.staff_number.trim()) return setError('Staff number is required')
    if (!form.surname.trim()) return setError('Surname is required')

    setSaving(true)
    try {
      const payload = {
        staff: {
          staff_number: form.staff_number.trim(),
          employment_type: form.employment_type.trim() || null,
          role_title: form.role_title.trim() || null,
          employment_status: form.employment_status.trim() || null,
        },
        owner: {
          full_name: form.full_name.trim() || null,
          surname: form.surname.trim() || null,
          other_names: form.other_names.trim() || null,
        },
      }

      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update staff')

      window.location.href = `/staff/${staffId}`
    } catch (e: any) {
      setError(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  if (!canUpdate) {
    return (
      <div className="p-8">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          Access denied: missing <b>staff.update</b>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <h1 className="text-2xl font-bold text-sky-700 mb-6">Edit Staff</h1>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <input className="border p-2 rounded" value={form.surname} onChange={(e) => setForm((s) => ({ ...s, surname: e.target.value }))} placeholder="Surname" />
            <input className="border p-2 rounded" value={form.other_names} onChange={(e) => setForm((s) => ({ ...s, other_names: e.target.value }))} placeholder="Other Names" />

            <input className="border p-2 rounded col-span-2" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="Full Name (optional override)" />

            <input className="border p-2 rounded" value={form.staff_number} onChange={(e) => setForm((s) => ({ ...s, staff_number: e.target.value }))} placeholder="Staff Number" />
            <input className="border p-2 rounded" value={form.employment_type} onChange={(e) => setForm((s) => ({ ...s, employment_type: e.target.value }))} placeholder="Employment Type" />

            <input className="border p-2 rounded" value={form.role_title} onChange={(e) => setForm((s) => ({ ...s, role_title: e.target.value }))} placeholder="Role Title" />
            <input className="border p-2 rounded" value={form.employment_status} onChange={(e) => setForm((s) => ({ ...s, employment_status: e.target.value }))} placeholder="Employment Status" />

            <button
              disabled={saving}
              className="col-span-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white py-2 rounded"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}