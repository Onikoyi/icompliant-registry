'use client'

import { useEffect, useMemo, useState } from 'react'

type ConfigItem = {
  id?: string
  category: string
  code: string
  label: string
}

type GroupedConfig = {
  employment_type?: ConfigItem[]
  staff_role?: ConfigItem[]
  employment_status?: ConfigItem[]
}

function groupConfig(items: ConfigItem[]): GroupedConfig {
  return items.reduce((acc: GroupedConfig, item) => {
    const key = item.category as keyof GroupedConfig
    if (!acc[key]) acc[key] = []
    acc[key]!.push(item)
    return acc
  }, {})
}

export default function NewStaffPage() {
  const [form, setForm] = useState({
    full_name: '',
    surname: '',
    other_names: '',
    staff_number: '',
    employment_type: '',
    role_title: '',
    employment_status: '',
  })

  const [rawConfig, setRawConfig] = useState<any>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config', { credentials: 'include' })
        const data = await res.json()
        setRawConfig(data)
      } catch (e) {
        console.error(e)
        setRawConfig(null)
      } finally {
        setLoadingConfig(false)
      }
    }

    fetchConfig()
  }, [])

  const config: GroupedConfig = useMemo(() => {
    // ✅ Support both shapes:
    // - array: [{category, code, label}, ...]
    // - grouped: { employment_type: [...], staff_role: [...], ... }
    if (Array.isArray(rawConfig)) {
      return groupConfig(rawConfig as ConfigItem[])
    }
    if (rawConfig && typeof rawConfig === 'object') {
      return rawConfig as GroupedConfig
    }
    return {}
  }, [rawConfig])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setMessage('Staff created successfully')
      window.location.href = '/staff'
      return
    }

    setError(data.error || 'Unable to create staff')
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-2 text-sky-700">Create Staff</h1>
      <p className="text-sm text-gray-500 mb-6">
        Register a new staff and generate an owner profile.
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
        <input
          name="full_name"
          placeholder="Full Name"
          onChange={handleChange}
          value={form.full_name}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="surname"
          placeholder="Surname"
          onChange={handleChange}
          value={form.surname}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="other_names"
          placeholder="Other Names"
          onChange={handleChange}
          value={form.other_names}
          className="w-full border p-2 rounded"
        />

        <input
          name="staff_number"
          placeholder="Staff Number"
          onChange={handleChange}
          value={form.staff_number}
          className="w-full border p-2 rounded"
          required
        />

        {/* EMPLOYMENT TYPE */}
        <select
          name="employment_type"
          onChange={handleChange}
          value={form.employment_type}
          className="w-full border p-2 rounded"
          required
          disabled={loadingConfig}
        >
          <option value="">
            {loadingConfig ? 'Loading employment types...' : 'Select Employment Type'}
          </option>
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
          value={form.role_title}
          className="w-full border p-2 rounded"
          required
          disabled={loadingConfig}
        >
          <option value="">
            {loadingConfig ? 'Loading roles...' : 'Select Role'}
          </option>
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
          value={form.employment_status}
          className="w-full border p-2 rounded"
          required
          disabled={loadingConfig}
        >
          <option value="">
            {loadingConfig ? 'Loading statuses...' : 'Select Status'}
          </option>
          {config.employment_status?.map((item: any) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading || loadingConfig}
          className="bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white px-4 py-2 rounded w-full font-semibold"
        >
          {loading ? 'Creating...' : 'Create Staff'}
        </button>
      </form>
    </div>
  )
}