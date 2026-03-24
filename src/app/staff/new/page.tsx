'use client'

import { useEffect, useState } from 'react'

export default function NewStaffPage() {
  const [form, setForm] = useState({
    full_name: '',
    surname: '',
    other_names: '',
    staff_number: '',
    employment_type: '',
    role_title: '',
    employment_status: ''
  })

  const [config, setConfig] = useState<any>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchConfig() {
      const res = await fetch('/api/config')
      const data = await res.json()
      setConfig(data)
    }

    fetchConfig()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (res.ok) {
      setMessage('Staff created successfully')
    } else {
      setMessage(data.error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">

      <h1 className="text-2xl font-bold mb-6">
        Create Staff
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          name="full_name"
          placeholder="Full Name"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="surname"
          placeholder="Surname"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="other_names"
          placeholder="Other Names"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="staff_number"
          placeholder="Staff Number"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        {/* EMPLOYMENT TYPE */}
        <select
          name="employment_type"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Select Employment Type</option>
          {config.employment_type?.map((item: any) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>

        {/* ROLE TITLE */}
        <select
          name="role_title"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Select Role</option>
          {config.staff_role?.map((item: any) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>

        {/* STATUS */}
        <select
          name="employment_status"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Select Status</option>
          {config.employment_status?.map((item: any) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded"
        >
          Create Staff
        </button>

      </form>

      {message && (
        <p className="mt-4 text-green-600">
          {message}
        </p>
      )}

    </div>
  )
}