'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitQAReview(
  attempt_id: string,
  scores: Record<string, number>,
  feedback: string,
  totalMarksObtained: number,
  totalMaxMarks: number
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const supabaseAdmin = createAdminClient()

  // শতকরা কত পেলো তা বের করা
  const overallPercentage = Math.round((totalMarksObtained / totalMaxMarks) * 100)

  // ১. Attempt-এর স্ট্যাটাস ও মার্কস আপডেট করা
  const { error: updateError } = await supabaseAdmin
    .from('evaluation_attempts')
    .update({
      status: 'PUBLISHED',
      qa_id: user.id,
      qa_feedback: feedback,
      overall_score: overallPercentage,
      finalized_at: new Date().toISOString()
    })
    .eq('attempt_id', attempt_id)

  if (updateError) throw updateError

  // ২. প্রত্যেকটা উত্তরের মার্কস সেভ করা (Optional but good for reports)
  const { data: attempt } = await supabaseAdmin.from('evaluation_attempts').select('id').eq('attempt_id', attempt_id).single()
  
  if (attempt) {
    for (const [questionId, marks] of Object.entries(scores)) {
      await supabaseAdmin.from('answers').update({ marks_awarded: marks }).eq('attempt_id', attempt.id).eq('question_id', questionId)
    }
  }

  revalidatePath('/qa/dashboard')
  revalidatePath('/agent/dashboard')
  
  return { success: true }
}
