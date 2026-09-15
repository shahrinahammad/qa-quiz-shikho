import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamClient from './ExamClient'

export default async function ExamPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('evaluation_attempts')
    .select(`*, evaluations(*)`)
    .eq('attempt_id', params.attempt_id)
    .single()

  if (!attempt) redirect('/agent/dashboard')

  let questions = []
  // শুধু ওই ইভালুয়েশনের জন্য সিলেক্ট করা প্রশ্নগুলো আনা
  if (attempt.evaluations?.question_ids?.length > 0) {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .in('id', attempt.evaluations.question_ids)
    questions = data || []
  }

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ExamClient attempt={attempt} questions={questions} />
      </div>
    </div>
  )
}
