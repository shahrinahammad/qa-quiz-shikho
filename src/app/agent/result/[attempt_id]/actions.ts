'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function requestRecheck(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const agent_feedback = formData.get('agent_feedback') as string
  const supabaseAdmin = createAdminClient()

  await supabaseAdmin
    .from('evaluation_attempts')
    .update({ status: 'RECHECK_REQUESTED', agent_feedback: agent_feedback })
    .eq('attempt_id', attempt_id)

  revalidatePath('/agent/dashboard')
  redirect('/agent/dashboard')
}
