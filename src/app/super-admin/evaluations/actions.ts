'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEvaluation(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const duration_minutes = parseInt(formData.get('duration_minutes') as string)
  const passing_score = parseInt(formData.get('passing_score') as string)
  const agent_id = formData.get('agent_id') as string
  // ফর্ম থেকে সিলেক্ট করা প্রশ্নগুলো নেওয়া
  const question_ids = formData.getAll('question_ids') as string[]

  if (question_ids.length === 0) {
    return redirect('/super-admin/evaluations?error=Please select at least one question.')
  }

  const evaluation_id = `EVL-${Date.now().toString().slice(-6)}`

  const { data: evalData, error: evalError } = await supabase
    .from('evaluations')
    .insert({ evaluation_id, title, description, duration_minutes, passing_score, created_by: user.id, status: 'ASSIGNED', question_ids })
    .select().single()

  if (evalError) return redirect(`/super-admin/evaluations?error=${evalError.message}`)

  const attempt_id = `ATT-${Math.floor(1000 + Math.random() * 9000)}`
  await supabase.from('evaluation_attempts').insert({ attempt_id, evaluation_id: evalData.id, agent_id: agent_id, status: 'ASSIGNED' })

  revalidatePath('/super-admin/evaluations')
  redirect('/super-admin/evaluations?success=Evaluation assigned successfully!')
}
