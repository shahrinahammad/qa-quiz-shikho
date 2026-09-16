import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReviewClient from './ReviewClient'

export default async function QAReviewPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 🔒 Security Lock: QA বা Super Admin ছাড়া কেউ ঢুকতে পারবে না
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa' && profile?.role !== 'super_admin') redirect('/dashboard')

  const supabaseAdmin = createAdminClient()

  // Attempt এবং Evaluation তথ্য আনা
  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations(*), profiles!evaluation_attempts_agent_id_fkey(full_name, email)`)
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
        
        {/* যদি রিচেক রিকোয়েস্ট থাকে, তবে এজেন্টের দেওয়া ফিডব্যাক এখানে বড় করে শো করবে */}
        {attempt.status === 'RECHECK_REQUESTED' && attempt.agent_feedback && (
          <div className="mb-6 bg-orange-50 border-2 border-orange-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-orange-800 mb-2 uppercase tracking-wide flex items-center gap-2">⚠️ Agent's Recheck Objection</h3>
            <p className="text-orange-900 font-poppins text-lg bg-white p-4 rounded-xl border border-orange-100">{attempt.agent_feedback}</p>
          </div>
        )}
        
        <ReviewClient attempt={attempt} questions={questions || []} answers={answers || []} />
      </div>
    </div>
  )
}
