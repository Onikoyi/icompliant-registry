import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

async function getStudents(search?: string) {
  const supabase = await createServerClient()

  let query = supabase
    .from('students')
    .select(`
      id,
      matric_number,
      level,
      admission_year,
      owners (
        full_name,
        owner_key
      )
    `)
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  // If no search → return full dataset
  if (!search || search.trim() === '') {
    return data ?? []
  }

  const lower = search.toLowerCase()

  return (
    data?.filter((student: any) =>
      student.matric_number?.toLowerCase().includes(lower) ||
      student.owners?.full_name?.toLowerCase().includes(lower)
    ) ?? []
  )
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams?.search?.trim() || ''

  const students = await getStudents(search)

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students Registry</h1>

        <Link
          href="/students/new"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
        >
          + Add Student
        </Link>
      </div>

      {/* 🔎 SEARCH */}
      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name or matric number..."
          className="border border-gray-300 px-4 py-2 rounded w-80"
        />
        <button
          type="submit"
          className="bg-sky-700 text-white px-4 py-2 rounded"
        >
          Search
        </button>

        {search && (
          <Link
            href="/students"
            className="px-4 py-2 bg-gray-200 rounded text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">Full Name</th>
            <th className="p-3 border">Matric Number</th>
            <th className="p-3 border">Level</th>
            <th className="p-3 border">Admission Year</th>
          </tr>
        </thead>

        <tbody>
          {students.length > 0 ? (
            students.map((student: any) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="p-3 border">
                  <Link
                    href={`/students/${student.id}`}
                    className="text-blue-600 font-medium"
                  >
                    {student.owners?.full_name}
                  </Link>
                </td>
                <td className="p-3 border">{student.matric_number}</td>
                <td className="p-3 border">{student.level}</td>
                <td className="p-3 border">{student.admission_year}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}