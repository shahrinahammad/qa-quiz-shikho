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

// Individual Reminder (Single Agent)
export async function sendIndividualReminder(agentId: string, examTitle: string) {
  await sendPushNotification(
    agentId,
    '⚠️ URGENT: Exam Pending',
    `You have not submitted "${examTitle}" yet. Please complete it immediately.`
  )
}

// Bulk Reminder (Super Admin or QA)
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
      
      const examTitle = Array.isArray(exam.evaluations) 
        ? exam.evaluations[0]?.title 
        : exam.evaluations?.title

      if (examTitle) {
        try {
          await sendPushNotification(
            exam.agent_id,
            '⚠️ URGENT: Exam Pending',
            `You have not submitted "${examTitle}" yet. Please complete it immediately.`
          )
        } catch (e) {
          console.error('Failed to send reminder to:', exam.agent_id)
        }
      }
    }
  }
}

// 🆕 Auto Reassign Logic
export async function autoReassignQuiz(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const agent_id = formData.get('agent_id') as string
  const campaign = formData.get('campaign') as string
  const qa_id = formData.get('qa_id') as string
  const original_eval_id = formData.get('eval_id') as string

  const supabaseAdmin = createAdminClient()

  // ১. একই ক্যাম্পেইনের সব ইভ্যালুয়েশন বের করা
  const { data: campaignEvals } = await supabaseAdmin
    .from('evaluations')
    .select('id')
    .eq('campaign', campaign || 'General')

  // ২. এজেন্ট ইতিমধ্যে কোন কোন পরীক্ষা দিয়েছে তা বের করা
  const { data: agentAttempts } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('evaluation_id')
    .eq('agent_id', agent_id)

  const attemptedEvalIds = agentAttempts?.map(a => a.evaluation_id) || []
  
  // ৩. নতুন আনরিড প্রশ্ন ফিল্টার করা
  const availableEvals = campaignEvals?.filter(e => !attemptedEvalIds.includes(e.id)) || []

  // ৪. যদি নতুন প্রশ্ন থাকে সেটি দিবে, না থাকলে পুরোটাই আবার দিবে
  const newEvalId = availableEvals.length > 0 ? availableEvals[0].id : original_eval_id

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
