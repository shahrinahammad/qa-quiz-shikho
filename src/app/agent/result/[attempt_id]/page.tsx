import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requestRecheck } from './actions'

export default async function ResultPage({ params }: { params: { attempt_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ডাটাবেস সিকিউরিটি বাইপাস করার জন্য অ্যাডমিন চাবি ব্যবহার করা হলো
  const supabaseAdmin = createAdminClient()

  const { data: attempt } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations(*)`)
    .eq('attempt_id', params.attempt_id)
    .single()

  if (!attempt || !['PUBLISHED', 'RECHECK_REQUESTED'].includes(attempt.status)) {
    redirect('/agent/dashboard')
  }

  // অ্যাডমিন চাবি দিয়ে উত্তরগুলো আনা হলো যাতে ডাটাবেস ব্লক না করে
  const { data: answers } = await supabaseAdmin
    .from('answers')
    .select('*, questions(*)')
    .eq('attempt_id', attempt.id)
    
  const isPassed = attempt.overall_score >= attempt.evaluations.passing_score

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {attempt.status === 'RECHECK_REQUESTED' && (
          <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl text-orange-700 font-bold font-poppins flex justify-between items-center">
            <span>⚠️ Your recheck request is under QA review.</span>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold font-poppins text-gray-900">{attempt.evaluations.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Evaluated on: {new Date(attempt.finalized_at || attempt.created_at).toLocaleDateString()}</p>
          </div>
          <div className={`px-6 py-3 rounded-xl border-2 text-center ${isPassed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-xs font-bold uppercase ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{isPassed ? 'Passed' : 'Needs Improvement'}</p>
            <p className={`text-3xl font-black ${isPassed ? 'text-green-700' : 'text-red-700'}`}>{attempt.overall_score}%</p>
          </div>
        </div>

        {attempt.qa_feedback && (
          <div className="bg-shikho-magenta-50 p-6 rounded-2xl border border-shikho-magenta-100">
            <h2 className="text-sm font-bold text-shikho-magenta-600 uppercase tracking-wide mb-2">QA Feedback</h2>
            <p className="text-gray-800 font-poppins">{attempt.qa_feedback}</p>
          </div>
        )}

        {/* Question Breakdown - এখন এটা ঠিকমতো শো করবে */}
        <h3 className="text-lg font-bold text-gray-900 font-poppins pt-4">Question Breakdown</h3>
        <div className="space-y-4">
          {answers?.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No answers recorded.</p>
          ) : (
            answers?.map((ans: any, index: number) => (
              <div key={ans.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-gray-500">Q{index + 1}.</span>
                  <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-md text-gray-700">Marks: {ans.marks_awarded || 0} / {ans.questions.marks}</span>
                </div>
                <p className="text-base text-gray-900 font-bengali font-medium mb-4">{ans.questions.content}</p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 font-bengali">
                  <span className="font-bold text-xs uppercase text-gray-400 block mb-1">Your Answer:</span>
                  {ans.text_answer && <p>{ans.text_answer}</p>}
                  {ans.audio_url && <audio src={ans.audio_url} controls className="mt-2 h-8 w-full max-w-xs" />}
                  {!ans.text_answer && !ans.audio_url && <span className="italic text-gray-400">No answer provided.</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Feedback / Objection Form */}
        {attempt.status === 'PUBLISHED' && (
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 mt-8 shadow-sm">
            <h3 className="text-sm font-bold text-orange-800 mb-2 font-poppins">Not satisfied with the result?</h3>
            <form action={requestRecheck} className="space-y-3">
              <input type="hidden" name="attempt_id" value={attempt.attempt_id} />
              <textarea name="agent_feedback" required rows={2} className="w-full px-4 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-500 text-sm font-poppins" placeholder="Write your feedback or reason for objection here..."></textarea>
              <div className="flex justify-between items-center mt-4">
                <Link href="/agent/dashboard" className="text-shikho-indigo-600 font-medium hover:underline text-sm">&larr; Back to Dashboard</Link>
                <button type="submit" className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm text-sm">
                  Submit Feedback & Request Recheck
                </button>
              </div>
            </form>
          </div>
        )}
        
        {attempt.status !== 'PUBLISHED' && (
          <div className="mt-4">
            <Link href="/agent/dashboard" className="text-shikho-indigo-600 font-medium hover:underline text-sm">&larr; Back to Dashboard</Link>
          </div>
        )}
        
      </div>
    </div>
  )
}
