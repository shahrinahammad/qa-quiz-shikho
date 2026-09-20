import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function QADashboard({ 
  searchParams 
}: { 
  searchParams: { from?: string, to?: string } 
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'qa' && profile?.role !== 'super_admin') redirect('/login')

  const from = searchParams.from || ''
  const to = searchParams.to || ''
  const supabaseAdmin = createAdminClient()
  
  // Fetch all profiles for name mapping (To show Assigner Name)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  // 1. Pending & Disputes (No Date Filter)
  const { data: allTasks } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *, 
      evaluations!inner (title, duration_minutes, passing_score, created_by), 
      profiles!evaluation_attempts_agent_id_fkey (full_name, email),
      qa:profiles!evaluation_attempts_qa_id_fkey (full_name)
    `)
    .in('status', ['UNDER_QA_REVIEW', 'RECHECK_REQUESTED'])
    .order('submitted_at', { ascending: false })

  const pendingReviews = allTasks?.filter(t => t.status === 'UNDER_QA_REVIEW') || []
  const recheckRequests = allTasks?.filter(t => t.status === 'RECHECK_REQUESTED') || []

  // 2. Personal Stats for logged-in QA (Overall Summary)
  const { data: myStats } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('status, evaluations!inner(created_by)')
    .eq('evaluations.created_by', user.id)

  const myTotalAssigned = myStats?.length || 0
  const myAgentSubmitted = myStats?.filter(t => t.status !== 'ASSIGNED').length || 0
  const myQAReviewed = myStats?.filter(t => t.status === 'PUBLISHED').length || 0
  const myPendingAction = myStats?.filter(t => t.status === 'UNDER_QA_REVIEW' || t.status === 'RECHECK_REQUESTED').length || 0

  // 3. Tracking Report (Date Filtered - Only exams created by THIS QA)
  let trackingQuery = supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *, 
      evaluations!inner(title, created_by), 
      agent:profiles!evaluation_attempts_agent_id_fkey(full_name), 
      qa:profiles!evaluation_attempts_qa_id_fkey(full_name)
    `)
    .eq('evaluations.created_by', user.id)
    .order('created_at', { ascending: false })

  if (from) trackingQuery = trackingQuery.gte('created_at', `${from}T00:00:00Z`)
  if (to) trackingQuery = trackingQuery.lte('created_at', `${to}T23:59:59Z`)
  
  const { data: trackingReports } = await trackingQuery

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">QA Workspace</h1>
            <p className="text-gray-500 text-sm mt-1">Manage pending evaluations and track your assigned exams.</p>
          </div>
        </header>

        {/* 📊 NEW: QA Personal Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">Total Assigned By Me</p>
            <p className="text-3xl font-black text-gray-900">{myTotalAssigned}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">Agent Submitted</p>
            <p className="text-3xl font-black text-blue-600">{myAgentSubmitted}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">Reviewed / Done</p>
            <p className="text-3xl font-black text-green-600">{myQAReviewed}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-shikho-magenta-100 bg-shikho-magenta-50/20">
            <p className="text-sm text-shikho-magenta-600 font-bold">Action Needed (Pending)</p>
            <p className="text-3xl font-black text-shikho-magenta-600">{myPendingAction}</p>
          </div>
        </div>

        {/* Recheck Requests (Disputes) */}
        {recheckRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-orange-600 font-poppins mb-4 flex items-center gap-2">⚠️ Dispute Requests ({recheckRequests.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recheckRequests.map((attempt: any) => (
                <div key={attempt.id} className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{attempt.evaluations.title}</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><span className="font-bold">Agent:</span> {attempt.profiles?.full_name || attempt.profiles?.email}</p>
                    {/* 👤 NEW: Assigner Name */}
                    <p className="text-sm text-gray-600"><span className="font-bold">Assigned By:</span> <span className="text-shikho-magenta-600">{profileMap[attempt.evaluations.created_by]}</span></p>
                  </div>
                  
                  {attempt.agent_feedback && (
                    <div className="bg-white p-3 rounded-lg border border-orange-100 mb-4 text-sm text-gray-700">
                      <span className="font-bold text-orange-700 block mb-1">Agent's Note:</span>
                      {attempt.agent_feedback}
                    </div>
                  )}
                  
                  <Link href={`/qa/review/${attempt.attempt_id}`} className="block text-center bg-orange-500 text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm">
                    Review Dispute
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Pending Reviews */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Pending Reviews ({pendingReviews.length})</h2>
          {pendingReviews.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl text-center border-dashed border-2 text-gray-400">
              No regular pending reviews. Great job!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pendingReviews.map((attempt: any) => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{attempt.evaluations.title}</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><span className="font-bold">Agent:</span> {attempt.profiles?.full_name || attempt.profiles?.email}</p>
                    {/* 👤 NEW: Assigner Name */}
                    <p className="text-sm text-gray-600"><span className="font-bold">Assigned By:</span> <span className="text-shikho-magenta-600">{profileMap[attempt.evaluations.created_by]}</span></p>
                  </div>
                  <Link href={`/qa/review/${attempt.attempt_id}`} className="block text-center bg-shikho-magenta-500 text-white py-2.5 rounded-lg font-bold hover:bg-shikho-magenta-600 transition-colors shadow-sm">
                    Start Reviewing
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Assigned Exams Tracking Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">Exams Assigned By Me (Tracking)</h2>
            
            {/* Date Filter */}
            <form method="GET" className="flex items-end gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From</label>
                <input type="date" name="from" defaultValue={from} className="px-2 py-1 border rounded text-xs bg-white" />
              </div>
              <span className="text-gray-400 text-xs mb-1">to</span>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To</label>
                <input type="date" name="to" defaultValue={to} className="px-2 py-1 border rounded text-xs bg-white" />
              </div>
              <button type="submit" className="bg-shikho-magenta-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-shikho-magenta-600">
                Filter
              </button>
              {(from || to) && (
                <Link href="/qa/dashboard" className="text-[10px] font-bold text-red-500 hover:underline px-1 pb-1">Clear</Link>
              )}
            </form>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-poppins">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Exam Title</th>
                  <th className="p-4">Assigned To (Agent)</th>
                  <th className="p-4">Agent Status</th>
                  <th className="p-4">Review Status</th>
                  <th className="p-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trackingReports?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No exams assigned in this date range.</td>
                  </tr>
                ) : (
                  trackingReports?.map((row: any) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="p-4 text-xs font-medium text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{row.evaluations?.title}</td>
                      <td className="p-4 text-sm text-gray-700">{row.agent?.full_name || 'N/A'}</td>
                      
                      <td className="p-4 text-xs font-bold">
                        {row.status === 'ASSIGNED' ? <span className="text-red-500">❌ Pending</span> : <span className="text-green-600">✅ Submitted</span>}
                      </td>
                      
                      <td className="p-4 text-xs font-bold">
                        {row.status === 'PUBLISHED' ? (
                          <span className="text-green-600">✅ Done by {row.qa?.full_name || 'QA'}</span>
                        ) : row.status === 'RECHECK_REQUESTED' ? (
                          <span className="text-orange-600">⚠️ Recheck Requested</span>
                        ) : (
                          <span className="text-gray-500">⏳ Pending Review</span>
                        )}
                      </td>
                      
                      <td className="p-4 text-sm font-bold text-shikho-indigo-600 text-right">
                        {row.overall_score !== null ? `${row.overall_score}%` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
