import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AgentDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ডাটাবেস থেকে এজেন্টের অ্যাসাইন করা পরীক্ষাগুলো নিয়ে আসা
  const { data: attempts } = await supabase
    .from('evaluation_attempts')
    .select(`
      id,
      attempt_id,
      status,
      overall_score,
      created_at,
      evaluations (
        title,
        duration_minutes,
        passing_score,
        evaluation_id
      )
    `)
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">My Evaluations</h1>
          <p className="text-gray-500 text-sm mt-1 font-poppins">Complete your assigned tests and track your progress.</p>
        </header>

        {/* Assigned Evaluations List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Pending & Completed</h2>
          
          {attempts?.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl shadow-sm border border-gray-100 text-center border-dashed border-2">
              <p className="text-gray-500 font-poppins">You have no assigned evaluations right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {attempts?.map((attempt: any) => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium font-poppins ${
                        attempt.status === 'ASSIGNED' ? 'bg-shikho-sunrise-500/10 text-shikho-sunrise-500' :
                        attempt.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {attempt.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 font-poppins font-medium">
                        {attempt.evaluations.duration_minutes} Mins
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 font-poppins mb-1">
                      {attempt.evaluations.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-poppins mb-4">
                      Pass Score: {attempt.evaluations.passing_score}%
                    </p>
                  </div>

                  {/* Actions based on status */}
                  {attempt.status === 'ASSIGNED' ? (
                    <Link 
                      href={`/agent/exam/${attempt.attempt_id}`}
                      className="w-full block text-center bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors shadow-ambient"
                    >
                      Start Evaluation
                    </Link>
                  ) : attempt.status === 'PUBLISHED' ? (
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-poppins font-medium text-gray-600">Overall Score:</span>
                        <span className={`text-xl font-bold font-poppins ${
                          attempt.overall_score >= attempt.evaluations.passing_score 
                            ? 'text-green-600' 
                            : 'text-shikho-coral-500'
                        }`}>
                          {attempt.overall_score}%
                        </span>
                      </div>
                      <Link 
                        href={`/agent/result/${attempt.attempt_id}`} 
                        className="w-full block text-center bg-gray-900 text-white py-2 rounded-lg font-poppins font-medium hover:bg-gray-800 transition-colors"
                      >
                        View Detailed Feedback
                      </Link>
                    </div>
                  ) : (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-poppins font-medium cursor-not-allowed">
                      Under QA Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
