import { supabase } from '@/lib/supabase'

export async function getApprovalPipelineDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      status,
      created_at,
      owners ( full_name, owner_key ),
      document_types ( name, requires_approval ),
      document_workflow_instances (
        id,
        status,
        current_handler_id,
        document_workflow_steps (
          id,
          role,
          action,
          comment,
          created_at,
          users:actor_user_id ( email )
        )
      )
    `)
    .eq('document_types.requires_approval', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}