import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

async function getStaff(search?: string) {
  const supabase = await createServerClient()

  let query = supabase
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

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  if (!search || search.trim() === '') {
    return data ?? []
  }

  const lower = search.toLowerCase()

  return (
    data?.filter((staff: any) =>
      staff.staff_number?.toLowerCase().includes(lower) ||
      staff.owners?.full_name?.toLowerCase().includes(lower)
    ) ?? []
  )
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams?.search?.trim() || ''

  const staffList = await getStaff(search)

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

      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name or staff number..."
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
            href="/staff"
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
            <th className="p-3 border">Staff Number</th>
            <th className="p-3 border">Role</th>
            <th className="p-3 border">Employment Type</th>
            <th className="p-3 border">Status</th>
          </tr>
        </thead>

        <tbody>
          {staffList.length > 0 ? (
            staffList.map((staff: any) => (
              <tr key={staff.id} className="hover:bg-gray-50">
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
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No staff found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}