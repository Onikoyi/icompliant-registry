import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createServerClient()

  // Total Students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  // Total Staff
  const { count: totalStaff } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })

  // Total Documents
  const { count: totalDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Pending Documents
  const { count: pendingDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Active Staff
  const { count: activeStaff } = await supabase
  .from('staff')
  .select('*', { count: 'exact', head: true })
  .ilike('employment_status', 'active')

  return {
    totalStudents: totalStudents ?? 0,
    totalStaff: totalStaff ?? 0,
    totalDocuments: totalDocuments ?? 0,
    pendingDocuments: pendingDocuments ?? 0,
    activeStaff: activeStaff ?? 0,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="max-w-7xl mx-auto mt-10 px-6">

      <h1 className="text-3xl font-bold text-sky-700 mb-8">
        Dashboard Overview
      </h1>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* STUDENTS */}
        <Link href="/students">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-sky-100 hover:shadow-xl transition cursor-pointer">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Students
              </h2>
              <span className="text-sky-600 text-2xl">🎓</span>
            </div>

            <p className="text-4xl font-bold text-sky-700">
              {stats.totalStudents}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Total registered students
            </p>
          </div>
        </Link>

        {/* STAFF */}
        <Link href="/staff">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-100 hover:shadow-xl transition cursor-pointer">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Staff
              </h2>
              <span className="text-amber-600 text-2xl">👨‍🏫</span>
            </div>

            <p className="text-4xl font-bold text-amber-700">
              {stats.totalStaff}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              {stats.activeStaff} Active staff
            </p>
          </div>
        </Link>

        {/* DOCUMENTS */}
        <Link href="/documents">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition cursor-pointer">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Documents
              </h2>
              <span className="text-purple-600 text-2xl">📄</span>
            </div>

            <p className="text-4xl font-bold text-purple-700">
              {stats.totalDocuments}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              {stats.pendingDocuments} Pending approval
            </p>
          </div>
        </Link>

      </div>

      {/* PROFESSIONAL INFO PANEL */}
      <div className="mt-12 bg-gradient-to-r from-sky-600 to-amber-500 text-white rounded-xl p-8 shadow-lg">
        <h2 className="text-xl font-semibold mb-2">
          Registry System Status
        </h2>
        <p className="text-sm opacity-90">
          All systems operational. Data integrity and compliance checks active.
        </p>
      </div>

    </div>
  )
}