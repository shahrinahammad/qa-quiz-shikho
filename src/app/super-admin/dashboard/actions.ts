'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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
    // ১. প্রথমে এজেন্টের দেওয়া উত্তরগুলো ডিলিট করা (Foreign Key Issue এড়াতে)
    await supabaseAdmin.from('answers').delete().eq('attempt_id', attempt.id)
    
    // ২. এবার মূল খাতা (Evaluation Attempt) ডিলিট করা
    await supabaseAdmin.from('evaluation_attempts').delete().eq('attempt_id', attempt_id)
  }

  revalidatePath('/super-admin/dashboard')
}
