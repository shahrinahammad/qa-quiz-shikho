'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createQuestion(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  // ফর্ম থেকে ডাটা নেওয়া
  const type = formData.get('type') as string
  const competency = formData.get('competency') as string
  const difficulty = formData.get('difficulty') as string
  const content = formData.get('content') as string
  const expected_answer = formData.get('expected_answer') as string
  const marks = parseInt(formData.get('marks') as string)

  // একটি ইউনিক Question ID তৈরি করা (যেমন: Q-CRM-8374)
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const question_id = `Q-${competency.substring(0, 3).toUpperCase()}-${randomNum}`

  const { error } = await supabase.from('questions').insert({
    question_id,
    type,
    competency,
    difficulty,
    content,
    expected_answer,
    marks,
    created_by: user.id
  })

  if (error) {
    return redirect(`/super-admin/question-bank?error=${error.message}`)
  }

  revalidatePath('/super-admin/question-bank')
  redirect('/super-admin/question-bank?success=Question added successfully!')
}
