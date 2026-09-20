'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/app/actions/notification'

export async function createEvaluation(formData: FormData): Promise<void> {
  const supabaseAdmin = createAdminClient()
  const supabase = createClient()
  
  // ১. ফর্মের বদলে সরাসরি সার্ভার থেকে ইউজারের আইডি নিচ্ছি
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return
  }

  const title = formData.get('title') as string
  const duration = parseInt(formData.get('duration') as string)
  const passingScore = parseInt(formData.get('passing_score') as string)
  const agentId = formData.get('agent_id') as string
  
  // ২. Question ডাটা পার্সিং ফিক্স (JSON বা Checkbox Array দুটোই সাপোর্ট করবে)
  const questionsData = formData.getAll('questions')
  let questions: string[] = []
  
  if (questionsData.length === 1 && typeof questionsData[0] === 'string') {
    try {
      questions = questionsData[0] ? JSON.parse(questionsData[0]) : []
    } catch(e) {
      questions = []
    }
  } else {
    questions = questionsData as string[]
  }

  if (!title || !duration || !passingScore || !agentId || questions.length === 0) {
    console.error('Validation failed: Missing required fields')
    return
  }

  try {
    // ৩. ইনসার্ট ডাটাবেস
    const { data: evalData, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .insert({
        title,
        duration_minutes: duration,
        passing_score: passingScore,
        created_by: user.id // সরাসরি সার্ভারের সিকিউর আইডি
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
        qa_id: user.id,
        status: 'ASSIGNED'
      })

    if (attemptError) throw attemptError

    // ৪. পুশ নোটিফিকেশন পাঠানো (Try-Catch এর ভেতরে যাতে এরর আসলেও ডাটা সেভ হয়)
    try {
      await sendPushNotification(
        agentId, 
        'New Exam Assigned 📝', 
        `QA has assigned a new exam (${title}) for you. Please check your dashboard.`
      )
    } catch (notifyError) {
      console.error('Notification failed but exam assigned:', notifyError)
    }

    // ৫. পেজ রিফ্রেশ করে নতুন ডাটা দেখানো
    revalidatePath('/super-admin/evaluations')
    revalidatePath('/qa/dashboard')
    
  } catch (err: any) {
    console.error('Database Error:', err.message)
  }
}
