import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function QADashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  const { data: allTasks } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations (title, duration_minutes, passing_score), profiles!evaluation_attempts_agent_id_fkey (full_name, email)`)
    .in('status', ['UNDER_QA_REVIEW', 'RECHECK_REQUESTED', 'PUBLISHED'])
    .order('submitted_at', { ascending: false })

  // টাস্কগুলোকে ৩টি ক্যাটাগরিতে ভাগ করা
  const pendingReviews = allTasks?.filter(t => t.status === 'UNDER_QA_REVIEW') || []
  const recheckRequests = allTasks?.filter(t => t.status === 'RECHECK_REQUESTED') || []
  const completedReviews = allTasks?.filter(t => t.status === 'PUBLISHED' && t.qa_id === user.id) || []

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">QA Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">Manage pending evaluations, resolve disputes, and view your evaluation history.</p>
        </header>

        {/* Recheck Requests (Disputes) */}
        {recheckRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-orange-600 font-poppins mb-4 flex items-center gap-2">⚠️ Dispute / Recheck Requests ({recheckRequests.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recheckRequests.map((attempt: any) => (
                <div key={attempt.id} className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{attempt.evaluations.title}</h3>
                  <p className="text-sm text-gray-600 mb-4"><span className="font-medium">Agent:</span> {attempt.profiles?.full_name}</p>
                  <Link href={`/qa/review/${attempt.attempt_id}`} className="block text-center bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600">Review Dispute</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Pending Reviews */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Pending Reviews ({pendingReviews.length})</h2>
          {pendingReviews.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl text-center border-dashed border-2 text-gray-500">No regular pending reviews.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pendingReviews.map((attempt: any) => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{attempt.evaluations.title}</h3>
                  <p className="text-sm text-gray-600 mb-4"><span className="font-medium">Agent:</span> {attempt.profiles?.full_name}</p>
                  <Link href={`/qa/review/${attempt.attempt_id}`} className="block text-center bg-shikho-magenta-500 text-white py-2 rounded-lg font-bold hover:bg-shikho-magenta-600">Start Reviewing</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QA History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Your Completed Evaluations ({completedReviews.length})</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-poppins">
                <tr><th className="p-4">Exam Title</th><th className="p-4">Agent Name</th><th className="p-4">Score Given</th><th className="p-4 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedReviews.map((attempt: any) => (
                  <tr key={attempt.id}>
                    <td className="p-4 text-sm font-bold text-gray-900">{attempt.evaluations.title}</td>
                    <td className="p-4 text-sm text-gray-600">{attempt.profiles?.full_name}</td>
                    <td className="p-4 text-sm font-bold text-shikho-indigo-600">{attempt.overall_score}%</td>
                    <td className="p-4 text-right"><Link href={`/qa/review/${attempt.attempt_id}`} className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">View Finalized Copy</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
