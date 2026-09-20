'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/app/actions/notification'

export async function createEvaluation(formData: FormData): Promise<void> {
  const supabaseAdmin = createAdminClient()
  const title = formData.get('title') as string
  const duration = parseInt(formData.get('duration') as string)
  const passingScore = parseInt(formData.get('passing_score') as string)
  const agentId = formData.get('agent_id') as string
  const questionsJson = formData.get('questions') as string
  const createdBy = formData.get('created_by') as string

  if (!title || !duration || !passingScore || !agentId || !questionsJson || !createdBy) {
    console.error('All fields are required.')
    return
  }

  const questions = JSON.parse(questionsJson)
  if (!questions || questions.length === 0) {
    console.error('Please select at least one question.')
    return
  }

  try {
    const { data: evalData, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .insert({
        title,
        duration_minutes: duration,
        passing_score: passingScore,
        created_by: createdBy
      })
      .select()
      .single()

    if (evalError) throw evalError

    const questionsToInsert = questions.map((qId: string) => ({
      evaluation_id: evalData.id,
      question_id: qId
    }))

    const { error: eqError } = await supabaseAdmin
      .from('evaluation_questions')
      .insert(questionsToInsert)

    if (eqError) throw eqError

    const { error: attemptError } = await supabaseAdmin
      .from('evaluation_attempts')
      .insert({
        evaluation_id: evalData.id,
        agent_id: agentId,
        qa_id: createdBy,
        status: 'ASSIGNED'
      })

    if (attemptError) throw attemptError

    // 🔔 Send Push Notification to Agent
    await sendPushNotification(
      agentId, 
      'New Exam Assigned 📝', 
      `QA has assigned a new exam (${title}) for you. Please check your dashboard.`
    )

    revalidatePath('/super-admin/evaluations')
  } catch (err: any) {
    console.error('Failed to assign evaluation:', err.message)
  }
}
