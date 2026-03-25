'use client'

import { useState } from 'react'

export default function NewStudentPage() {
  const [form, setForm] = useState({
    full_name: '',
    surname: '',
    other_names: '',
    matric_number: '',
    level: '',
    admission_year: '',
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!form.admission_year || Number.isNaN(Number(form.admission_year))) {
      setError('Admission year must be a valid number.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        admission_year: Number(form.admission_year),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setMessage('Student created successfully')
      // ✅ Optional: redirect to students list for smoother workflow
      window.location.href = '/students'
      return
    }

    setError(data.error || 'Unable to create student')
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-2 text-sky-700">Create Student</h1>
      <p className="text-sm text-gray-500 mb-6">
        Register a new student and generate an owner profile.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-100 text-green-700 text-sm p-2 rounded mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Full Name
          </label>
          <input
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Surname
          </label>
          <input
            name="surname"
            placeholder="Surname"
            value={form.surname}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Other Names
          </label>
          <input
            name="other_names"
            placeholder="Other Names"
            value={form.other_names}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Matric Number
          </label>
          <input
            name="matric_number"
            placeholder="Matric Number"
            value={form.matric_number}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Level
          </label>
          <input
            name="level"
            placeholder="Level"
            value={form.level}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Admission Year
          </label>
          <input
            name="admission_year"
            placeholder="Admission Year"
            value={form.admission_year}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            inputMode="numeric"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white px-4 py-2 rounded w-full font-semibold"
        >
          {loading ? 'Creating...' : 'Create Student'}
        </button>
      </form>
    </div>
  )
}