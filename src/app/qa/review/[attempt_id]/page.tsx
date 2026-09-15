import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReviewClient from './ReviewClient'

export default async function QAReviewPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()

  // Attempt এবং Evaluation তথ্য আনা
  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations(*), profiles!evaluation_attempts_agent_id_fkey(full_name)`)
    .eq('attempt_id', params.attempt_id)
    .single()

  if (!attempt) redirect('/qa/dashboard')

  // প্রশ্নগুলো আনা
  const { data: questions } = await supabaseAdmin.from('questions').select('*')

  // এজেন্টের দেওয়া উত্তর ও অডিও লিংক আনা
  const { data: answers } = await supabaseAdmin
    .from('answers')
    .select('*')
    .eq('attempt_id', attempt.id)

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ReviewClient attempt={attempt} questions={questions || []} answers={answers || []} />
      </div>
    </div>
  )
}
