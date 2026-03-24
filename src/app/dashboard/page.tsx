export default function DashboardPage() {
    return (
      <div className="space-y-8">
  
        <div>
          <h1 className="text-2xl font-bold text-sky-700">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Overview of registry system activity
          </p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  
          <div className="bg-white p-6 rounded-xl shadow border border-sky-200">
            <p className="text-sm text-gray-500">Students</p>
            <h2 className="text-2xl font-bold text-sky-700">—</h2>
          </div>
  
          <div className="bg-white p-6 rounded-xl shadow border border-amber-200">
            <p className="text-sm text-gray-500">Staff</p>
            <h2 className="text-2xl font-bold text-amber-700">—</h2>
          </div>
  
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <p className="text-sm text-gray-500">Documents</p>
            <h2 className="text-2xl font-bold text-gray-700">—</h2>
          </div>
  
        </div>
  
      </div>
    )
  }