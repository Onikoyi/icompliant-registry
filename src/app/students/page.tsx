import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function getStudents() {
  const { data, error } = await supabase
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

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export default async function StudentsPage() {
  const students = await getStudents()

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
          {students.map((student: any) => (
            <tr
              key={student.id}
              className="hover:bg-gray-50 cursor-pointer"
            >
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
          ))}
        </tbody>
      </table>
    </div>
  )
}