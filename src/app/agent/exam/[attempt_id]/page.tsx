import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamClient from './ExamClient'

export default async function ExamPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Attempt এবং Evaluation-এর তথ্য নিয়ে আসা
  const { data: attempt } = await supabase
    .from('evaluation_attempts')
    .select(`*, evaluations(*)`)
    .eq('attempt_id', params.attempt_id)
    .single()

  if (!attempt) redirect('/agent/dashboard')

  // আপাতত ডেমো পারপাসে ডাটাবেস থেকে ৫টি র‍্যান্ডম প্রশ্ন নিয়ে আসছি
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .limit(5)

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ExamClient attempt={attempt} questions={questions || []} />
      </div>
    </div>
  )
}
