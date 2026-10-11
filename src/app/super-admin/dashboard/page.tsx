import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { deleteEvaluationAttempt, sendIndividualReminder, sendBulkReminder } from './actions'
import ReportButtons from '@/components/ReportButtons'
import ExportCSV from '@/components/ExportCSV' // 🆕 Export CSV Component

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
  
  let query = supabaseAdmin
    .from('evaluation_attempts')
    // Note: 'campaign' will be dynamically read after the DB update.
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

  // 📊 1. QA Performance, Pass/Fail & Raw Data Prep
  const qaPerformance: Record<string, any> = {}
  let totalPassed = 0
  let totalFailed = 0

  const enrichedReports = reports?.map((r: any) => {
    const assignerId = r.evaluations?.created_by
    const assignerName = profileMap[assignerId] || 'Admin / Unknown'
    r.qaName = assignerName // Storing for CSV export

    // QA Stats
    if (!qaPerformance[assignerId]) qaPerformance[assignerId] = { name: assignerName, totalAssigned: 0, totalSubmitted: 0, totalReviewed: 0, totalRecheck: 0 }
    qaPerformance[assignerId].totalAssigned += 1
    if (r.status !== 'ASSIGNED') qaPerformance[assignerId].totalSubmitted += 1
    if (r.status === 'PUBLISHED') qaPerformance[assignerId].totalReviewed += 1
    if (r.status === 'RECHECK_REQUESTED') qaPerformance[assignerId].totalRecheck += 1

    // Pass/Fail Logic
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      if (r.overall_score >= r.evaluations.passing_score) totalPassed++
      else totalFailed++
    }

    return r
  }) || []
  
  const qaReportArray = Object.values(qaPerformance)

  // 📊 2. Agent-wise Analytics
  const agentStats: Record<string, any> = {}
  enrichedReports.forEach((r: any) => {
    const agentName = r.agent?.full_name || 'Unknown Agent'
    if (!agentStats[agentName]) {
      agentStats[agentName] = { name: agentName, assigned: 0, submitted: 0, passed: 0, failed: 0, sumScore: 0 }
    }
    agentStats[agentName].assigned += 1
    if (r.status !== 'ASSIGNED') agentStats[agentName].submitted += 1
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      agentStats[agentName].sumScore += r.overall_score
      if (r.overall_score >= r.evaluations.passing_score) agentStats[agentName].passed += 1
      else agentStats[agentName].failed += 1
    }
  })
  const agentReportArray = Object.values(agentStats)

  // 📊 3. Campaign-wise Analytics (Mocked for now until DB update)
  const campaignStats: Record<string, any> = {}
  enrichedReports.forEach((r: any) => {
    const campaignName = r.evaluations?.campaign || 'General (Uncategorized)'
    if (!campaignStats[campaignName]) {
      campaignStats[campaignName] = { name: campaignName, assigned: 0, submitted: 0, passed: 0, failed: 0 }
    }
    campaignStats[campaignName].assigned += 1
    if (r.status !== 'ASSIGNED') campaignStats[campaignName].submitted += 1
    if (r.overall_score !== null && r.evaluations?.passing_score !== null) {
      if (r.overall_score >= r.evaluations.passing_score) campaignStats[campaignName].passed += 1
      else campaignStats[campaignName].failed += 1
    }
  })
  const campaignReportArray = Object.values(campaignStats)

  const passRate = (totalPassed + totalFailed) > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dayOfWeek = today.getDay()
  const daysSinceSaturday = (dayOfWeek + 1) % 7
  const lastSaturday = new Date(today)
  lastSaturday.setDate(today.getDate() - daysSinceSaturday - (daysSinceSaturday === 0 && dayOfWeek !== 6 ? 7 : 0))
  lastSaturday.setHours(0, 0, 0, 0)

  const dailyReports = reports?.filter(r => new Date(r.created_at) >= today) || []
  const weeklyReports = reports?.filter(r => new Date(r.created_at) >= lastSaturday) || []

  const generateWaText = (data: any[], title: string, dateRangeText: string) => {
    const assigned = data.length
    const submitted = data.filter(r => r.status !== 'ASSIGNED').length
    const reviewed = data.filter(r => r.status === 'PUBLISHED').length
    const disputes = data.filter(r => r.status === 'RECHECK_REQUESTED').length

    let text = `*${title}* 📊\n🗓️ _${dateRangeText}_\n\n`
    text += `*OVERALL SUMMARY*\n=================\n`
    text += `🎯 *TOTAL ASSIGNED:* ${assigned}\n✅ *AGENT SUBMITTED:* ${submitted}\n🔎 *QA REVIEWED:* ${reviewed}\n⚠️ *RECHECK ISSUES:* ${disputes}\n\n`
    text += `*QA PERFORMANCE BREAKDOWN*\n=================\n👤 *QA Name | Assign | Submit | Review | Recheck*\n\n`

    Object.values(qaPerformance).forEach((qa: any, index: number) => {
      const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
      const emoji = index < 10 ? numbers[index] : `*${index + 1}.*`
      text += `${emoji} *${qa.name}*\n └ ${qa.totalAssigned} | ${qa.totalSubmitted} | ${qa.totalReviewed} | ${qa.totalRecheck}\n\n`
    })

    text += `_Generated automatically from Shikho QA Portal_ 🚀`
    return encodeURIComponent(text)
  }

  const dailyWaLink = `https://wa.me/?text=${generateWaText(dailyReports, `Shikho QA Daily Report`, new Date().toLocaleDateString('en-GB', {weekday: 'long', month: 'short', day: 'numeric'}))}`
  const weeklyDateStr = `${lastSaturday.toLocaleDateString('en-GB', {weekday: 'short', month: 'short', day: 'numeric'})} - Present`
  const weeklyWaLink = `https://wa.me/?text=${generateWaText(weeklyReports, `Shikho QA Weekly Impact Report`, weeklyDateStr)}`

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Filter */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
            <Link href="/super-admin/dashboard" className="text-xs font-bold text-red-500 hover:underline px-2 pb-1">Reset</Link>
          </form>
        </header>

        <ReportButtons />

        {/* Action Links & CSV Download Button */}
        <div className="flex flex-wrap items-center gap-4">
          <ExportCSV data={enrichedReports} filename={`QA_Report_${from}_to_${to}`} />
          
          <Link href="/super-admin/impact-report" className="flex items-center gap-2 bg-gradient-to-r from-shikho-indigo-600 to-shikho-magenta-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all shadow-sm text-sm font-poppins">
            📸 View Visual Impact Report
          </Link>
          <a href={dailyWaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#1da851] transition-colors shadow-sm text-sm font-poppins">
            💬 Share Daily
          </a>
          <a href={weeklyWaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#128C7E] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#0c6b5e] transition-colors shadow-sm text-sm font-poppins">
            📊 Share Weekly
          </a>
        </div>

        {/* 1. Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Total Assigned</p><p className="text-3xl font-black text-gray-900">{total}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Agent Submitted</p><p className="text-3xl font-black text-blue-600">{agentCompleted}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">QA Reviewed</p><p className="text-3xl font-black text-emerald-600">{qaReviewed}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 bg-orange-50/30"><p className="text-sm text-orange-600 font-bold">Pass Rate</p><p className="text-3xl font-black text-orange-600">{passRate}%</p></div>
        </div>

        {/* 2. Pass/Fail Summary Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-poppins">Performance Overview</h2>
            <p className="text-sm text-gray-500">Global pass/fail count based on target passing score</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-sm font-bold text-gray-500 uppercase">Total Passed</p>
              <p className="text-3xl font-black text-emerald-600">{totalPassed}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-500 uppercase">Total Failed</p>
              <p className="text-3xl font-black text-red-500">{totalFailed}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. QA Performance Summary */}
          {qaReportArray.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-md font-semibold text-gray-900 font-poppins">QA Performance Summary</h2>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">QA Name</th>
                      <th className="px-4 py-3 text-center">Assigned</th>
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Reviewed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {qaReportArray.map((qa: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">{qa.name}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-600 text-center">{qa.totalAssigned}</td>
                        <td className="px-4 py-3 text-xs text-blue-600 font-bold text-center">{qa.totalSubmitted}</td>
                        <td className="px-4 py-3 text-xs text-emerald-600 font-bold text-center">{qa.totalReviewed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Campaign-wise Analytics */}
          {campaignReportArray.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-md font-semibold text-gray-900 font-poppins">Campaign-wise Report</h2>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">Campaign (Monthly Event)</th>
                      <th className="px-4 py-3 text-center">Assigned</th>
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Passed</th>
                      <th className="px-4 py-3 text-center">Failed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campaignReportArray.map((camp: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-bold text-shikho-indigo-600">{camp.name}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-600 text-center">{camp.assigned}</td>
                        <td className="px-4 py-3 text-xs text-blue-600 font-bold text-center">{camp.submitted}</td>
                        <td className="px-4 py-3 text-xs text-emerald-600 font-bold text-center">{camp.passed}</td>
                        <td className="px-4 py-3 text-xs text-red-500 font-bold text-center">{camp.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 5. Agent-wise Analytics */}
        {agentReportArray.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-blue-50/50">
              <h2 className="text-md font-semibold text-blue-900 font-poppins">Agent-wise Performance Report</h2>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Agent Name</th>
                    <th className="px-6 py-4 text-center">Assigned</th>
                    <th className="px-6 py-4 text-center">Submitted</th>
                    <th className="px-6 py-4 text-center">Passed</th>
                    <th className="px-6 py-4 text-center">Failed</th>
                    <th className="px-6 py-4 text-center">Avg. Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agentReportArray.map((ag: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{ag.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-600 text-center">{ag.assigned}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-bold text-center">{ag.submitted}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-bold text-center">{ag.passed}</td>
                      <td className="px-6 py-4 text-sm text-red-500 font-bold text-center">{ag.failed}</td>
                      <td className="px-6 py-4 text-sm text-shikho-indigo-600 font-bold text-center">
                        {ag.passed + ag.failed > 0 ? Math.round(ag.sumScore / (ag.passed + ag.failed)) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Assignment & Review Tracking (Detailed List) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">Assignment & Review Tracking</h2>
            
            <form action={async () => {
              'use server'
              await sendBulkReminder(profile?.role === 'super_admin' ? undefined : user.id)
            }}>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                🔔 Remind All Pending
              </button>
            </form>
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
                {reports?.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-400 text-sm">No data found for selected dates.</td></tr> : reports?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.evaluations?.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{profileMap[row.evaluations?.created_by] || 'Admin'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.agent?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs font-bold">{row.status === 'ASSIGNED' ? <span className="text-red-500">❌ Pending</span> : <span className="text-green-600">✅ Submitted</span>}</td>
                    
                    <td className="px-6 py-4 text-xs font-bold">
                      {row.status === 'PUBLISHED' ? (
                        <span className="text-green-600">✅ Reviewed ({row.qa?.full_name || 'QA'})</span>
                      ) : row.status === 'RECHECK_REQUESTED' ? (
                        <span className="text-orange-600">⚠️ Recheck Requested</span>
                      ) : (
                        <span className="text-gray-500">⏳ Pending Review</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-sm font-bold text-shikho-indigo-600">{row.overall_score !== null ? `${row.overall_score}%` : '-'}</td>
                    
                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                      
                      {row.status === 'ASSIGNED' && (
                        <form action={async () => {
                          'use server'
                          await sendIndividualReminder(row.agent_id, row.evaluations?.title)
                        }}>
                          <button type="submit" className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded hover:bg-orange-100 transition-colors uppercase tracking-wider">
                            🔔 Remind
                          </button>
                        </form>
                      )}

                      <Link 
                        href={row.status === 'ASSIGNED' ? `/agent/evaluation/${row.attempt_id}` : row.status === 'UNDER_QA_REVIEW' ? `/qa/review/${row.attempt_id}` : `/agent/result/${row.attempt_id}`}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors uppercase tracking-wider"
                      >
                        View
                      </Link>
                      
                      <form action={deleteEvaluationAttempt}>
                        <input type="hidden" name="attempt_id" value={row.attempt_id} />
                        <button type="submit" className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors uppercase tracking-wider">Delete</button>
                      </form>
                    </td>
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
