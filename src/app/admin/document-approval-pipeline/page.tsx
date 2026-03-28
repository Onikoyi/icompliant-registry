import { getApprovalPipelineDocuments } from '@/lib/queries/workflow'
import { requirePermission } from '@/lib/rbac'
import ApprovalPipelineTable from '@/components/workflow/ApprovalPipelineTable'

export default async function ApprovalPipelinePage() {
  await requirePermission('document.approve')

  const documents = await getApprovalPipelineDocuments()

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-sky-700 mb-6">
        Document Approval Pipeline
      </h1>

      <ApprovalPipelineTable documents={documents} />
    </div>
  )
}