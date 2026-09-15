'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEvaluation(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  // ফর্ম থেকে ডাটা নেওয়া
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const duration_minutes = parseInt(formData.get('duration_minutes') as string)
  const passing_score = parseInt(formData.get('passing_score') as string)
  const agent_id = formData.get('agent_id') as string

  // Unique Evaluation ID (যেমন: EVL-260915-1234)
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const evaluation_id = `EVL-${dateStr}-${randomNum}`

  // ১. Evaluations টেবিলে ডাটা সেভ করা
  const { data: evalData, error: evalError } = await supabase
    .from('evaluations')
    .insert({
      evaluation_id,
      title,
      description,
      duration_minutes,
      passing_score,
      created_by: user.id,
      status: 'ASSIGNED'
    })
    .select()
    .single()

  if (evalError) {
    return redirect(`/super-admin/evaluations?error=${evalError.message}`)
  }

  // ২. নির্দিষ্ট এজেন্টকে অ্যাসাইন করা (Attempt তৈরি করা)
  const attempt_id = `ATT-${Math.floor(1000 + Math.random() * 9000)}`
  const { error: attemptError } = await supabase
    .from('evaluation_attempts')
    .insert({
      attempt_id,
      evaluation_id: evalData.id,
      agent_id: agent_id,
      status: 'ASSIGNED'
    })

  if (attemptError) {
    return redirect(`/super-admin/evaluations?error=${attemptError.message}`)
  }

  revalidatePath('/super-admin/evaluations')
  redirect('/super-admin/evaluations?success=Evaluation assigned successfully!')
}
