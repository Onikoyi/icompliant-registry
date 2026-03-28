import { requirePermission } from '@/lib/rbac'
import { getAuditLogs } from '@/lib/queries/audit'
import AuditLogTable from '@/components/admin/AuditLogTable'

interface Props {
  searchParams: Promise<{
    userId?: string
    entityType?: string
    from?: string
    to?: string
  }>
}

export default async function AuditLogsPage({ searchParams }: Props) {
  const params = await searchParams

  await requirePermission('config.manage')

 const logs = await getAuditLogs(params)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-sky-700 mb-6">
        Audit Logs
      </h1>

      <AuditLogTable logs={logs} />
    </div>
  )
}