'use client'

import { useEffect, useMemo, useState } from 'react'

export default function ConfigPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [form, setForm] = useState({
    category: '',
    code: '',
    label: '',
  })
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  const canManageConfig = useMemo(
    () => permissions.includes('config.manage'),
    [permissions]
  )

  async function fetchConfigs() {
    const res = await fetch('/api/config', { cache: 'no-store' })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Failed to load configs')
    }

    setConfigs(data)
  }

  useEffect(() => {
    async function init() {
      setPageLoading(true)
      setError('')

      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
        const meData = await meRes.json()

        if (!meRes.ok) {
          throw new Error(meData.error || 'Failed to load current user')
        }

        setPermissions(meData.permissions || [])

        if ((meData.permissions || []).includes('config.manage')) {
          await fetchConfigs()
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setPageLoading(false)
      }
    }

    init()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save config')
      }

      setForm({ category: '', code: '', label: '' })
      await fetchConfigs()
    } catch (err: any) {
      setError(err.message || 'Failed to save config')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setError('')

    try {
      const res = await fetch('/api/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete config')
      }

      await fetchConfigs()
    } catch (err: any) {
      setError(err.message || 'Failed to delete config')
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-6">
              System Configuration
            </h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!canManageConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-3">
              Access Denied
            </h1>
            <p className="text-gray-700">
              You do not have permission to manage system configuration.
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
          <h1 className="text-2xl font-bold text-sky-700 mb-6">
            System Configuration
          </h1>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mb-8">
            <input
              name="category"
              placeholder="Category (e.g. employment_type)"
              value={form.category}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />

            <input
              name="code"
              placeholder="Code (e.g. full_time)"
              value={form.code}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />

            <input
              name="label"
              placeholder="Label (e.g. Full-Time)"
              value={form.label}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />

            <button
              type="submit"
              className="col-span-3 bg-sky-700 hover:bg-sky-800 text-white py-2 rounded"
            >
              {loading ? 'Saving...' : 'Add Config'}
            </button>
          </form>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Category</th>
                <th className="p-3 border">Code</th>
                <th className="p-3 border">Label</th>
                <th className="p-3 border">Action</th>
              </tr>
            </thead>

            <tbody>
              {configs.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{item.category}</td>
                  <td className="p-3 border">{item.code}</td>
                  <td className="p-3 border">{item.label}</td>
                  <td className="p-3 border">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {configs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No configuration values found.
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