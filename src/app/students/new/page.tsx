'use client'

import { useState } from 'react'

export default function NewStudentPage() {
  const [form, setForm] = useState({
    full_name: '',
    surname: '',
    other_names: '',
    matric_number: '',
    level: '',
    admission_year: ''
  })

  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        admission_year: Number(form.admission_year)
      })
    })

    const data = await res.json()

    if (res.ok) {
      setMessage('Student created successfully')
    } else {
      setMessage(data.error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-6">Create New Student</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          name="full_name"
          placeholder="Full Name"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="surname"
          placeholder="Surname"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="other_names"
          placeholder="Other Names"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="matric_number"
          placeholder="Matric Number"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="level"
          placeholder="Level"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="admission_year"
          placeholder="Admission Year"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Create Student
        </button>

      </form>

      {message && (
        <p className="mt-4 text-green-600">{message}</p>
      )}
    </div>
  )
}