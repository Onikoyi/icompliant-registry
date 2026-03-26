'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type StudentPayload = {
  student: {
    id: string
    matric_number: string
    level: string | null
    admission_year: number | null
    graduation_year: number | null
    academic_status: string | null
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
  // /students/<id>/edit
  const parts = pathname.split('/').filter(Boolean)
  const idx = parts.findIndex((p) => p === 'students')
  return String(idx >= 0 ? parts[idx + 1] : '').trim()
}

export default function StudentEditPage() {
  const pathname = usePathname()
  const studentId = getIdFromPath(pathname)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const canUpdate = useMemo(() => permissions.includes('student.update'), [permissions])

  const [form, setForm] = useState({
    matric_number: '',
    level: '',
    admission_year: '',
    graduation_year: '',
    academic_status: '',
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

      if (!(meData.permissions || []).includes('student.update')) return

      const res = await fetch(`/api/students/${studentId}`, { cache: 'no-store' })
      const data = (await res.json()) as StudentPayload
      if (!res.ok) throw new Error((data as any).error || 'Failed to load student')

      setForm({
        matric_number: data.student.matric_number || '',
        level: data.student.level || '',
        admission_year: data.student.admission_year ? String(data.student.admission_year) : '',
        graduation_year: data.student.graduation_year ? String(data.student.graduation_year) : '',
        academic_status: data.student.academic_status || '',
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
    if (studentId) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!canUpdate) return setError('You do not have permission to update students.')

    if (!form.matric_number.trim()) return setError('Matric number is required')
    if (!form.surname.trim()) return setError('Surname is required')

    const admission_year = form.admission_year.trim() ? Number(form.admission_year) : null
    const graduation_year = form.graduation_year.trim() ? Number(form.graduation_year) : null
    if (admission_year !== null && !Number.isInteger(admission_year)) return setError('Admission year must be an integer')
    if (graduation_year !== null && !Number.isInteger(graduation_year)) return setError('Graduation year must be an integer')

    setSaving(true)
    try {
      const payload = {
        student: {
          matric_number: form.matric_number.trim(),
          level: form.level.trim() || null,
          admission_year,
          graduation_year,
          academic_status: form.academic_status.trim() || null,
        },
        owner: {
          full_name: form.full_name.trim() || null,
          surname: form.surname.trim() || null,
          other_names: form.other_names.trim() || null,
        },
      }

      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update student')

      window.location.href = `/students/${studentId}`
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
          Access denied: missing <b>student.update</b>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <h1 className="text-2xl font-bold text-sky-700 mb-6">Edit Student</h1>

          {error && (
            <div className="mb-5 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <input className="border p-2 rounded" value={form.surname} onChange={(e) => setForm((s) => ({ ...s, surname: e.target.value }))} placeholder="Surname" />
            <input className="border p-2 rounded" value={form.other_names} onChange={(e) => setForm((s) => ({ ...s, other_names: e.target.value }))} placeholder="Other Names" />

            <input className="border p-2 rounded col-span-2" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="Full Name (optional override)" />

            <input className="border p-2 rounded" value={form.matric_number} onChange={(e) => setForm((s) => ({ ...s, matric_number: e.target.value }))} placeholder="Matric Number" />
            <input className="border p-2 rounded" value={form.level} onChange={(e) => setForm((s) => ({ ...s, level: e.target.value }))} placeholder="Level" />

            <input className="border p-2 rounded" value={form.admission_year} onChange={(e) => setForm((s) => ({ ...s, admission_year: e.target.value }))} placeholder="Admission Year" />
            <input className="border p-2 rounded" value={form.graduation_year} onChange={(e) => setForm((s) => ({ ...s, graduation_year: e.target.value }))} placeholder="Graduation Year" />

            <input className="border p-2 rounded col-span-2" value={form.academic_status} onChange={(e) => setForm((s) => ({ ...s, academic_status: e.target.value }))} placeholder="Academic Status" />

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