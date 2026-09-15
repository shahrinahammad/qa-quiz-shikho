'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitEvaluation(attempt_id: string, answers: Record<string, string>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // ১. Attempt-এর মূল ID বের করা
  const { data: attempt } = await supabase
    .from('evaluation_attempts')
    .select('id')
    .eq('attempt_id', attempt_id)
    .single()

  if (!attempt) throw new Error("Attempt not found")

  // ২. উত্তরগুলো ডাটাবেসে সেভ করার জন্য প্রস্তুত করা
  const answersToInsert = Object.entries(answers).map(([question_id, text_answer]) => ({
    attempt_id: attempt.id,
    question_id: question_id,
    text_answer: text_answer
  }))

  if (answersToInsert.length > 0) {
    const { error: insertError } = await supabase.from('answers').insert(answersToInsert)
    if (insertError) throw insertError
  }

  // ৩. পরীক্ষার স্ট্যাটাস আপডেট করা (SUBMITTED -> QA Review)
  const { error: updateError } = await supabase
    .from('evaluation_attempts')
    .update({
      status: 'UNDER_QA_REVIEW',
      submitted_at: new Date().toISOString()
    })
    .eq('attempt_id', attempt_id)

  if (updateError) throw updateError

  revalidatePath('/agent/dashboard')
  revalidatePath('/qa/dashboard')
  
  return { success: true }
}
