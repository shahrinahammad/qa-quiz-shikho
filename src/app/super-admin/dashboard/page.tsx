import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReportButtons from '@/components/ReportButtons'
import ExportCSV from '@/components/ExportCSV'
import TrackingTable from '@/components/TrackingTable'

export default async function SuperAdminDashboard({
  searchParams
}: {
  searchParams: { from?: string, to?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) 
  const from = searchParams.from !== undefined ? searchParams.from : todayDate
  const to = searchParams.to !== undefined ? searchParams.to : todayDate
  
  const supabaseAdmin = createAdminClient()
  
  // 🛠️ FIXED: Removed 'campaign' from this query to prevent Database Error
  let query = supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations!inner(title, passing_score, created_by), agent:profiles!evaluation_attempts_agent_id_fkey(full_name), qa:profiles!evaluation_attempts_qa_id_fkey(full_name)`)
    .order('created_at', { ascending: false })

  if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59Z`)
  
  const { data: reports } = await query
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  const total = reports?.length || 0
  const agentCompleted = reports?.filter(r => r.status !== 'ASSIGNED').length || 0
  const qaReviewed = reports?.filter(r => r.status === 'PUBLISHED').length || 0

  const qaPerformance: Record<string, any> = {}
  const agentStats: Record<string, any> = {}
  const campaignStats: Record<string, any> = {}
  let totalPassed = 0
  let totalFailed = 0

  const enrichedReports = reports?.map((r: any) => {
    const assignerId = r.evaluations?.created_by
    const assignerName = profileMap[assignerId] || 'Admin / Unknown'
    r.qaName = assignerName 
    
    // Cap Score at 100%
    if (r.overall_score !== null && r.overall_score > 100) r.overall_score = 100 

    // QA Stats
    if (!qaPerformance[assignerId]) qaPerformance[assignerId] = { name: assignerName, totalAssigned: 0, totalSubmitted: 0, totalReviewed: 0, totalRecheck: 0 }
    qaPerformance[assignerId].totalAssigned += 1
    if (r.status !== 'ASSIGNED') qaPerformance[assignerId].totalSubmitted += 1
    if (r.status === 'PUBLISHED') qaPerformance[assignerId].totalReviewed += 1
    if (r.status === 'RECHECK_REQUESTED') qaPerformance[assignerId].totalRecheck += 1

    // Pass/Fail Counting
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      if (r.overall_score >= r.evaluations.passing_score) totalPassed++
      else totalFailed++
    }

    // Agent Stats
    const agentName = r.agent?.full_name || 'Unknown Agent'
    if (!agentStats[agentName]) agentStats[agentName] = { name: agentName, assigned: 0, submitted: 0, passed: 0, failed: 0, sumScore: 0 }
    agentStats[agentName].assigned += 1
    if (r.status !== 'ASSIGNED') agentStats[agentName].submitted += 1
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      agentStats[agentName].sumScore += r.overall_score
      if (r.overall_score >= r.evaluations.passing_score) agentStats[agentName].passed += 1
      else agentStats[agentName].failed += 1
    }

    // Campaign Stats (Mocked for now)
    const campaignName = 'General' 
    if (!campaignStats[campaignName]) campaignStats[campaignName] = { name: campaignName, assigned: 0, submitted: 0, passed: 0, failed: 0 }
    campaignStats[campaignName].assigned += 1
    if (r.status !== 'ASSIGNED') campaignStats[campaignName].submitted += 1
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      if (r.overall_score >= r.evaluations.passing_score) campaignStats[campaignName].passed += 1
      else campaignStats[campaignName].failed += 1
    }

    return r
  }) || []
  
  const qaReportArray = Object.values(qaPerformance)
  const agentReportArray = Object.values(agentStats)
  const campaignReportArray = Object.values(campaignStats)

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Super Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Platform overview and date-wise tracking report.</p>
          </div>
          
          <form method="GET" className="flex items-end gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From</label><input type="date" name="from" defaultValue={from} className="px-3 py-1.5 border rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To</label><input type="date" name="to" defaultValue={to} className="px-3 py-1.5 border rounded-lg text-sm bg-white" /></div>
            <button type="submit" className="bg-shikho-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold">Filter</button>
            <Link href="/super-admin/dashboard" className="text-xs font-bold text-red-500 hover:underline px-2 pb-1">Reset</Link>
          </form>
        </header>

        <ReportButtons />

        <div className="flex flex-wrap items-center gap-4">
          <ExportCSV data={enrichedReports} filename={`QA_Report_${from}_to_${to}`} />
          <Link href="/super-admin/impact-report" className="flex items-center gap-2 bg-gradient-to-r from-shikho-indigo-600 to-shikho-magenta-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg shadow-sm text-sm font-poppins">📸 View Visual Impact Report</Link>
        </div>

        {/* 5 Summary Cards with Pass & Fail */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
            <p className="text-3xl font-black text-emerald-600">{qaReviewed}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/50">
            <p className="text-sm text-emerald-700 font-bold">Total Passed</p>
            <p className="text-3xl font-black text-emerald-600">{totalPassed}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 bg-red-50/50">
            <p className="text-sm text-red-700 font-bold">Total Failed</p>
            <p className="text-3xl font-black text-red-600">{totalFailed}</p>
          </div>
        </div>

        {/* QA & Campaign Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {qaReportArray.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-shikho-magenta-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-shikho-magenta-50/30">
                <h2 className="text-md font-semibold text-shikho-magenta-600 font-poppins">QA Performance Summary</h2>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase font-bold sticky top-0">
                    <tr><th className="px-4 py-3">QA Name</th><th className="px-4 py-3 text-center">Assigned</th><th className="px-4 py-3 text-center">Submitted</th><th className="px-4 py-3 text-center">Reviewed</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {qaReportArray.map((qa: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-bold">{qa.name}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-gray-600">{qa.totalAssigned}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-blue-600">{qa.totalSubmitted}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-emerald-600">{qa.totalReviewed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {campaignReportArray.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-purple-50/50">
                <h2 className="text-md font-semibold text-purple-900 font-poppins">Campaign-wise Report</h2>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left">
                  <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm">
                    <tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3 text-center">Assigned</th><th className="px-4 py-3 text-center">Submitted</th><th className="px-4 py-3 text-center text-emerald-600">Passed</th><th className="px-4 py-3 text-center text-red-500">Failed</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campaignReportArray.map((camp: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-bold text-purple-600">{camp.name}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-gray-600">{camp.assigned}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-blue-600">{camp.submitted}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-emerald-600 bg-emerald-50/30">{camp.passed}</td>
                        <td className="px-4 py-3 text-xs font-bold text-center text-red-500 bg-red-50/30">{camp.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Agent-wise Report */}
        {agentReportArray.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-blue-50/50">
              <h2 className="text-md font-semibold text-blue-900 font-poppins">Agent Pass/Fail Report</h2>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left">
                <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm">
                  <tr><th className="px-4 py-3">Agent Name</th><th className="px-4 py-3 text-center">Assigned</th><th className="px-4 py-3 text-center text-blue-600">Submitted</th><th className="px-4 py-3 text-center text-emerald-600">Passed</th><th className="px-4 py-3 text-center text-red-500">Failed</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agentReportArray.map((ag: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-bold">{ag.name}</td>
                      <td className="px-4 py-3 text-xs font-bold text-center text-gray-600">{ag.assigned}</td>
                      <td className="px-4 py-3 text-xs font-bold text-center text-blue-600">{ag.submitted}</td>
                      <td className="px-4 py-3 text-xs font-bold text-center text-emerald-600 bg-emerald-50/30">{ag.passed}</td>
                      <td className="px-4 py-3 text-xs font-bold text-center text-red-500 bg-red-50/30">{ag.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dynamic Client Table */}
        <TrackingTable reports={enrichedReports} profileMap={profileMap} userRole={profile?.role} userId={user.id} />

      </div>
    </div>
  )
}
