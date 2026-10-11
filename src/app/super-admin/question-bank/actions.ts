'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createQuestion(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const type = formData.get('type') as string
  const competency = formData.get('competency') as string
  const difficulty = formData.get('difficulty') as string
  const content = formData.get('content') as string
  const expected_answer = formData.get('expected_answer') as string
  const campaign = formData.get('campaign') as string
  const marks = parseInt(formData.get('marks') as string)

  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const question_id = `Q-${competency.substring(0, 3).toUpperCase()}-${randomNum}`

  const { error } = await supabase.from('questions').insert({
    question_id,
    type,
    competency,
    difficulty,
    content,
    expected_answer,
    campaign: campaign || null,
    marks,
    created_by: user.id
  })

  if (error) {
    return redirect(`/super-admin/question-bank?error=${error.message}`)
  }

  revalidatePath('/super-admin/question-bank')
  redirect('/super-admin/question-bank?success=Question added successfully!')
}

export async function deleteQuestion(formData: FormData) {
  const id = formData.get('id') as string
  const supabaseAdmin = createAdminClient()
  
  await supabaseAdmin.from('questions').delete().eq('id', id)
  
  revalidatePath('/super-admin/question-bank')
  redirect('/super-admin/question-bank?success=Question deleted successfully!')
}

export async function updateQuestionCampaign(formData: FormData) {
  const id = formData.get('id') as string
  const campaign = formData.get('campaign') as string
  const supabaseAdmin = createAdminClient()
  
  const { error } = await supabaseAdmin.from('questions').update({ campaign: campaign || null }).eq('id', id)
  
  if (error) return redirect(`/super-admin/question-bank?error=${error.message}`)
  
  revalidatePath('/super-admin/question-bank')
  redirect('/super-admin/question-bank?success=Campaign updated successfully!')
}
