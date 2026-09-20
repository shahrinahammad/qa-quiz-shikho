import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { deleteEvaluationAttempt } from './actions'

export default async function SuperAdminDashboard({
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

  if (profile?.role !== 'super_admin') redirect('/login')

  const from = searchParams.from || ''
  const to = searchParams.to || ''
  const supabaseAdmin = createAdminClient()
  
  let query = supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *, 
      evaluations!inner(title, passing_score, created_by), 
      agent:profiles!evaluation_attempts_agent_id_fkey(full_name), 
      qa:profiles!evaluation_attempts_qa_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59Z`)
  
  const { data: reports } = await query
  
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  const total = reports?.length || 0
  const agentCompleted = reports?.filter(r => r.status !== 'ASSIGNED').length || 0
  const qaReviewed = reports?.filter(r => r.status === 'PUBLISHED').length || 0

  // 📊 QA-wise Performance Report তৈরি করার লজিক
  const qaPerformance: Record<string, any> = {}
  reports?.forEach((r: any) => {
    if (r.status === 'PUBLISHED' && r.qa_id && r.qa) {
      if (!qaPerformance[r.qa_id]) {
        qaPerformance[r.qa_id] = { name: r.qa.full_name, totalReviewed: 0, totalScore: 0 }
      }
      qaPerformance[r.qa_id].totalReviewed += 1
      qaPerformance[r.qa_id].totalScore += (r.overall_score || 0)
    }
  })
  
  const qaReportArray = Object.values(qaPerformance).map(qa => ({
    ...qa,
    avgScore: Math.round(qa.totalScore / qa.totalReviewed)
  }))

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Super Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Platform overview and date-wise tracking report.</p>
          </div>
          
          <form method="GET" className="flex items-end gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From Date</label>
              <input type="date" name="from" defaultValue={from} className="px-3 py-1.5 border rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To Date</label>
              <input type="date" name="to" defaultValue={to} className="px-3 py-1.5 border rounded-lg text-sm bg-white" />
            </div>
            <button type="submit" className="bg-shikho-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-shikho-indigo-700">Filter</button>
            {(from || to) && (
              <Link href="/super-admin/dashboard" className="text-xs font-bold text-red-500 hover:underline px-2">Clear</Link>
            )}
          </form>
        </header>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">Total Assigned</p>
            <p className="text-3xl font-black text-gray-900">{total}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">Agent Submitted</p>
            <p className="text-3xl font-black text-blue-600">{agentCompleted}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">QA Reviewed</p>
            <p className="text-3xl font-black text-green-600">{qaReviewed}</p>
          </div>
        </div>

        {/* 📊 NEW: QA Performance Report */}
        {qaReportArray.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-shikho-magenta-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-shikho-magenta-50/30">
              <h2 className="text-lg font-semibold text-shikho-magenta-600 font-poppins">QA Performance Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-poppins">
                  <tr>
                    <th className="px-6 py-4">QA Name</th>
                    <th className="px-6 py-4">Total Exams Reviewed</th>
                    <th className="px-6 py-4">Average Score Given</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {qaReportArray.map((qa: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{qa.name}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-bold">{qa.totalReviewed}</td>
                      <td className="px-6 py-4 text-sm text-green-600 font-bold">{qa.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Tracking Table with Delete Option */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">Assignment & Review Tracking</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase font-poppins">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Exam Title</th>
                  <th className="px-6 py-4">Assigned By</th>
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Agent Task</th>
                  <th className="px-6 py-4">QA Review</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-400 text-sm">No data found for selected dates.</td>
                  </tr>
                ) : (
                  reports?.map((row: any) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.evaluations?.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{profileMap[row.evaluations?.created_by] || 'Admin'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.agent?.full_name || 'N/A'}</td>
                      
                      <td className="px-6 py-4 text-xs font-bold">
                        {row.status === 'ASSIGNED' ? <span className="text-red-500">❌ Pending</span> : <span className="text-green-600">✅ Submitted</span>}
                      </td>
                      
                      <td className="px-6 py-4 text-xs font-bold">
                        {row.status === 'PUBLISHED' ? (
                          <span className="text-green-600">✅ Reviewed ({row.qa?.full_name || 'QA'})</span>
                        ) : (
                          <span className="text-orange-500">⏳ Pending Review</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-bold text-shikho-indigo-600">
                        {row.overall_score !== null ? `${row.overall_score}%` : '-'}
                      </td>

                      {/* 🗑️ Delete Button */}
                      <td className="px-6 py-4 text-right">
                        <form action={deleteEvaluationAttempt}>
                          <input type="hidden" name="attempt_id" value={row.attempt_id} />
                          <button type="submit" className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors">
                            Delete
                          </button>
                        </form>
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
