import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function QADashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  // যেসব খাতা UNDER_QA_REVIEW স্ট্যাটাসে আছে সেগুলো আনা
  const { data: pendingReviews } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *,
      evaluations (title, duration_minutes, passing_score),
      profiles!evaluation_attempts_agent_id_fkey (full_name, email)
    `)
    .eq('status', 'UNDER_QA_REVIEW')
    .order('submitted_at', { ascending: true })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">QA Workspace</h1>
            <p className="text-gray-500 text-sm mt-1">Review agent evaluations, listen to audio, and provide feedback.</p>
          </div>
        </header>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Pending Reviews ({pendingReviews?.length || 0})</h2>
          
          {pendingReviews?.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl shadow-sm border border-gray-100 text-center border-dashed border-2">
              <p className="text-gray-500 font-poppins">No pending reviews at the moment. Great job!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingReviews?.map((attempt: any) => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-shikho-sunrise-500/10 text-shikho-sunrise-500 px-3 py-1 rounded-full text-xs font-medium font-poppins">
                        NEEDS REVIEW
                      </span>
                      <span className="text-xs text-gray-400 font-poppins font-medium">
                        {new Date(attempt.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 font-poppins mb-1">
                      {attempt.evaluations.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-poppins mb-1">
                      <span className="font-medium">Agent:</span> {attempt.profiles?.full_name || attempt.profiles?.email}
                    </p>
                  </div>

                  <Link 
                    href={`/qa/review/${attempt.attempt_id}`}
                    className="mt-6 w-full block text-center bg-shikho-magenta-500 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-magenta-600 transition-colors shadow-ambient"
                  >
                    Start Reviewing
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
