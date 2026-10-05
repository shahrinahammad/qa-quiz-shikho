'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendPushNotification } from '@/app/actions/notification' 

export async function createEvaluation(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const duration_minutes = parseInt(formData.get('duration_minutes') as string)
  const passing_score = parseInt(formData.get('passing_score') as string)
  
  // 🛠️ FIXED: মাল্টিপল এজেন্টের আইডি রিসিভ করা হচ্ছে
  const agent_ids = formData.getAll('agent_ids') as string[]
  const question_ids = formData.getAll('question_ids') as string[]

  if (agent_ids.length === 0) {
    return redirect('/super-admin/evaluations?error=Please select at least one agent.')
  }

  if (question_ids.length === 0) {
    return redirect('/super-admin/evaluations?error=Please select at least one question.')
  }

  const evaluation_id = `EVL-${Date.now().toString().slice(-6)}`

  // ১. মূল ইভালুয়েশন তৈরি করা
  const { data: evalData, error: evalError } = await supabase
    .from('evaluations')
    .insert({ evaluation_id, title, description, duration_minutes, passing_score, created_by: user.id, status: 'ASSIGNED', question_ids })
    .select().single()

  if (evalError) return redirect(`/super-admin/evaluations?error=${evalError.message}`)

  // ২. সিলেক্ট করা প্রত্যেক এজেন্টের জন্য লুপ চালিয়ে এক্সাম অ্যাসাইন করা
  for (const agent_id of agent_ids) {
    const attempt_id = `ATT-${Math.floor(1000 + Math.random() * 9000)}`
    
    const { error: attemptError } = await supabase.from('evaluation_attempts').insert({ 
      attempt_id, 
      evaluation_id: evalData.id, 
      agent_id: agent_id, 
      status: 'ASSIGNED',
      qa_id: user.id 
    })

    if (!attemptError) {
      try {
        await sendPushNotification(
          agent_id, 
          'New Exam Assigned 📝', 
          `QA has assigned a new exam (${title}) for you. Please check your dashboard.`
        )
      } catch (notifyError) {
        console.error('Notification failed for agent:', agent_id)
      }
    }
  }

  revalidatePath('/super-admin/evaluations')
  revalidatePath('/super-admin/dashboard') 
  
  redirect('/super-admin/evaluations?success=Evaluation assigned successfully to selected agents!')
}
