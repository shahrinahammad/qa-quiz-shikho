'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/app/actions/notification'

export async function deleteEvaluationAttempt(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const supabaseAdmin = createAdminClient()

  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id')
    .eq('attempt_id', attempt_id)
    .single()

  if (attempt) {
    await supabaseAdmin.from('answers').delete().eq('attempt_id', attempt.id)
    await supabaseAdmin.from('evaluation_attempts').delete().eq('attempt_id', attempt_id)
  }

  revalidatePath('/super-admin/dashboard')
}

export async function sendIndividualReminder(agentId: string, examTitle: string) {
  await sendPushNotification(
    agentId,
    '⚠️ URGENT: Exam Pending',
    `You have not submitted "${examTitle}" yet. Please complete it immediately.`
  )
}

export async function sendBulkReminder(qaId?: string) {
  const supabaseAdmin = createAdminClient()
  let query = supabaseAdmin
    .from('evaluation_attempts')
    .select('agent_id, evaluations!inner(title)')
    .eq('status', 'ASSIGNED')

  if (qaId) {
    query = query.eq('qa_id', qaId)
  }

  const { data: pendingExams } = await query

  if (pendingExams) {
    for (const item of pendingExams) {
      const exam: any = item 
      const examTitle = Array.isArray(exam.evaluations) ? exam.evaluations[0]?.title : exam.evaluations?.title

      if (examTitle) {
        try {
          await sendPushNotification(exam.agent_id, '⚠️ URGENT: Exam Pending', `You have not submitted "${examTitle}" yet. Please complete it immediately.`)
        } catch (e) {
          console.error('Failed to send reminder to:', exam.agent_id)
        }
      }
    }
  }
}

// 🆕 UPDATED: Reassign Logic (Auto & Manual)
export async function reassignQuizAction(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const agent_id = formData.get('agent_id') as string
  const qa_id = formData.get('qa_id') as string
  const campaign = formData.get('campaign') as string
  const original_eval_id = formData.get('eval_id') as string
  const mode = formData.get('mode') as string // 'auto' or 'manual'
  const manual_eval_id = formData.get('manual_eval_id') as string

  const supabaseAdmin = createAdminClient()
  let newEvalId = original_eval_id

  if (mode === 'manual' && manual_eval_id) {
    newEvalId = manual_eval_id
  } else if (mode === 'auto') {
    // Auto find unattempted quiz in same campaign
    const { data: campaignEvals } = await supabaseAdmin.from('evaluations').select('id').eq('campaign', campaign || 'General')
    const { data: agentAttempts } = await supabaseAdmin.from('evaluation_attempts').select('evaluation_id').eq('agent_id', agent_id)
    const attemptedEvalIds = agentAttempts?.map(a => a.evaluation_id) || []
    
    const availableEvals = campaignEvals?.filter(e => !attemptedEvalIds.includes(e.id)) || []
    if (availableEvals.length > 0) newEvalId = availableEvals[0].id
  }

  const newAttemptId = `ATT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

  await supabaseAdmin.from('evaluation_attempts').insert({
    attempt_id: newAttemptId,
    evaluation_id: newEvalId,
    agent_id: agent_id,
    qa_id: qa_id,
    status: 'ASSIGNED',
    attempt_type: 'Reassigned',
    parent_attempt_id: attempt_id
  })

  revalidatePath('/super-admin/dashboard')
}
