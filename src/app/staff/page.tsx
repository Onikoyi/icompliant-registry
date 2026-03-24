import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function getStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      staff_number,
      employment_type,
      role_title,
      employment_status,
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

export default async function StaffPage() {
  const staffList = await getStaff()

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white shadow rounded">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Registry</h1>

        <Link
          href="/staff/new"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
        >
          + Add Staff
        </Link>
      </div>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">Full Name</th>
            <th className="p-3 border">Staff Number</th>
            <th className="p-3 border">Role</th>
            <th className="p-3 border">Employment Type</th>
            <th className="p-3 border">Status</th>
          </tr>
        </thead>

        <tbody>
          {staffList.map((staff: any) => (
            <tr
              key={staff.id}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-3 border">
                <Link
                  href={`/staff/${staff.id}`}
                  className="text-sky-600 font-medium"
                >
                  {staff.owners?.full_name}
                </Link>
              </td>

              <td className="p-3 border">{staff.staff_number}</td>
              <td className="p-3 border">{staff.role_title}</td>
              <td className="p-3 border">{staff.employment_type}</td>
              <td className="p-3 border">{staff.employment_status}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}