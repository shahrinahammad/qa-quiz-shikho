'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/app/actions/notification'

export async function deleteEvaluationAttempt(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const supabaseAdmin = createAdminClient()

  // প্রথমে attempt-এর ID বের করা
  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id')
    .eq('attempt_id', attempt_id)
    .single()

  if (attempt) {
    // ১. প্রথমে এজেন্টের দেওয়া উত্তরগুলো ডিলিট করা (Foreign Key Issue এড়াতে)
    await supabaseAdmin.from('answers').delete().eq('attempt_id', attempt.id)
    
    // ২. এবার মূল খাতা (Evaluation Attempt) ডিলিট করা
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

  // যদি QA কল করে, তবে শুধু তার অ্যাসাইন করা খাতাগুলো খুঁজবে
  if (qaId) {
    query = query.eq('qa_id', qaId)
  }

  const { data: pendingExams } = await query

  if (pendingExams) {
    // 🛠️ FIXED: Added 'as any[]' here too
    for (const exam of pendingExams as any[]) {
      try {
        await sendPushNotification(
          exam.agent_id,
          '⚠️ URGENT: Exam Pending',
          `You have not submitted "${exam.evaluations?.title}" yet. Please complete it immediately.`
        )
      } catch (e) {
        console.error('Failed to send reminder to:', exam.agent_id)
      }
    }
  }
}
