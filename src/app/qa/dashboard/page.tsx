import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QATaskClient from './QATaskClient' // 🆕 ইম্পোর্ট করা হলো

export default async function QADashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'qa' && profile?.role !== 'super_admin') redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  // 1. Fetch ALL relevant tasks for unified table
  const { data: allTasksData } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *, 
      evaluations!inner (title, duration_minutes, passing_score, created_by, campaign), 
      profiles!evaluation_attempts_agent_id_fkey (full_name, email),
      qa:profiles!evaluation_attempts_qa_id_fkey (full_name)
    `)
    .order('created_at', { ascending: false })

  const allTasks = allTasksData || []

  // 2. Personal Stats for logged-in QA
  const myStats = allTasks.filter(t => t.evaluations?.created_by === user.id)
  const myTotalAssigned = myStats.length
  const myAgentSubmitted = myStats.filter(t => t.status !== 'ASSIGNED').length
  const myQAReviewed = myStats.filter(t => t.status === 'PUBLISHED').length
  const myPendingAction = myStats.filter(t => t.status === 'UNDER_QA_REVIEW' || t.status === 'RECHECK_REQUESTED').length

  const recheckRequests = allTasks.filter(t => t.status === 'RECHECK_REQUESTED')

  // 3. Priority Logic & Data Formatting
  const sortedTasks = allTasks.map(t => ({
    id: t.id,
    attempt_id: t.attempt_id,
    created_at: t.created_at,
    title: t.evaluations?.title,
    campaign: t.evaluations?.campaign || 'General',
    agent_name: t.profiles?.full_name || t.profiles?.email || 'Unknown',
    assigner_name: profileMap[t.evaluations?.created_by] || 'Admin',
    status: t.status,
    overall_score: t.overall_score !== null ? Math.round(t.overall_score) : null,
    isMyPriority: t.evaluations?.created_by === user.id
  })).sort((a, b) => {
    // 🎯 Rule 1: Priority items at the top
    if (a.isMyPriority && !b.isMyPriority) return -1
    if (!a.isMyPriority && b.isMyPriority) return 1
    // 🎯 Rule 2: Actionable (Ready to Review) above pending agents
    if (a.status === 'UNDER_QA_REVIEW' && b.status !== 'UNDER_QA_REVIEW') return -1
    if (a.status !== 'UNDER_QA_REVIEW' && b.status === 'UNDER_QA_REVIEW') return 1
    // Rule 3: Date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">QA Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">Manage pending evaluations and track your assigned exams.</p>
        </header>

        {/* 📊 QA Personal Summary Cards */}
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{attempt.evaluations?.title}</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><span className="font-bold">Agent:</span> {attempt.profiles?.full_name || attempt.profiles?.email}</p>
                    <p className="text-sm text-gray-600"><span className="font-bold">Assigned By:</span> <span className="text-shikho-magenta-600">{profileMap[attempt.evaluations?.created_by]}</span></p>
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

        {/* 👑 NEW: Unified Interactive QA Review Tracking Table */}
        <QATaskClient tasks={sortedTasks} userId={user.id} />

      </div>
    </div>
  )
}
