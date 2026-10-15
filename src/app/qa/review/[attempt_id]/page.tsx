import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReviewClient from './ReviewClient'

export default async function QAReviewPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 🔒 Security Lock: QA বা Super Admin ছাড়া কেউ ঢুকতে পারবে না
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

  // 🛠️ BUG FIX: পুরোনো ডেটায় evaluation ডিলিট হয়ে গেলে যেন ক্র্যাশ না করে
  if (!attempt.evaluations) {
    return (
      <div className="min-h-screen bg-shikho-canvas p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2 font-poppins">Evaluation Not Found</h2>
          <p className="text-sm text-gray-600 mb-6 font-poppins">The original quiz for this attempt was deleted by the Admin. You cannot review it anymore.</p>
          <Link href="/qa/dashboard" className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors font-poppins">Go Back</Link>
        </div>
      </div>
    )
  }

  // 🛠️ BUG FIX: পুরোনো কুইজে question_ids null থাকলে array তে কনভার্ট করে দেওয়া
  const questionIds = attempt.evaluations.question_ids || []
  attempt.evaluations.question_ids = questionIds

  // 🚀 OPTIMIZATION: পুরো ডাটাবেস না খুঁজে শুধু ওই নির্দিষ্ট কুইজের প্রশ্নগুলো আনা
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .in('id', questionIds.length > 0 ? questionIds : ['dummy-id-to-prevent-error'])

  // এজেন্টের দেওয়া উত্তর ও অডিও লিংক আনা
  const { data: answers } = await supabaseAdmin
    .from('answers')
    .select('*')
    .eq('attempt_id', attempt.id)

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* যদি রিচেক রিকোয়েস্ট থাকে, তবে এজেন্টের দেওয়া ফিডব্যাক এখানে বড় করে শো করবে */}
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
