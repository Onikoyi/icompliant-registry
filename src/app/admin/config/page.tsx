'use client'

import { useEffect, useState } from 'react'

export default function ConfigPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [form, setForm] = useState({
    category: '',
    code: '',
    label: '',
  })

  const [loading, setLoading] = useState(false)

  async function fetchConfigs() {
    const res = await fetch('/api/config')
    const data = await res.json()
    setConfigs(data)
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (res.ok) {
      setForm({ category: '', code: '', label: '' })
      fetchConfigs()
    }
  }

  async function handleDelete(id: string) {
    await fetch('/api/config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    fetchConfigs()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">

      <div className="max-w-6xl mx-auto px-8 py-12">

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">

          <h1 className="text-2xl font-bold text-sky-700 mb-6">
            System Configuration
          </h1>

          {/* FORM */}
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

          {/* TABLE */}
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
            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}