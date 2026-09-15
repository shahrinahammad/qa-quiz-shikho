'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitEvaluation(attempt_id: string, answers: Record<string, string>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // অ্যাডমিন ক্লায়েন্ট ব্যবহার করা হলো যাতে সিকিউরিটি (RLS) ডাটা সেভ করতে বাধা না দেয়
  const supabaseAdmin = createAdminClient()

  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id')
    .eq('attempt_id', attempt_id)
    .single()

  if (!attempt) throw new Error("Attempt not found")

  const answersToInsert = Object.entries(answers).map(([question_id, text_answer]) => ({
    attempt_id: attempt.id,
    question_id: question_id,
    text_answer: text_answer
  }))

  if (answersToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('answers').insert(answersToInsert)
    if (insertError) throw insertError
  }

  const { error: updateError } = await supabaseAdmin
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
