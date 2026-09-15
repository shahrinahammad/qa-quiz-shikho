'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitEvaluation(
  attempt_id: string, 
  answers: Record<string, string>,
  audioUrls: Record<string, string> = {}
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const supabaseAdmin = createAdminClient()

  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id')
    .eq('attempt_id', attempt_id)
    .single()

  if (!attempt) throw new Error("Attempt not found")

  // টেক্সট এবং অডিও মিলিয়ে কোন কোন প্রশ্নের উত্তর দেওয়া হয়েছে তা বের করা
  const allQuestionIds = Array.from(new Set([...Object.keys(answers), ...Object.keys(audioUrls)]));

  const answersToInsert = allQuestionIds.map(qId => ({
    attempt_id: attempt.id,
    question_id: qId,
    text_answer: answers[qId] || '',
    audio_url: audioUrls[qId] || null
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
