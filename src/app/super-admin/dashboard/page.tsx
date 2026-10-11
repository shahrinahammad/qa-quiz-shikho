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
  
  // 🛠️ Fetching attempt_type and agent site
  let query = supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations!inner(title, passing_score, created_by, campaign), agent:profiles!evaluation_attempts_agent_id_fkey(full_name, site, qa_name), qa:profiles!evaluation_attempts_qa_id_fkey(full_name)`)
    .order('created_at', { ascending: false })

  if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59Z`)
  
  const { data: reports } = await query
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  const total = reports?.length || 0
  const agentCompleted = reports?.filter(r => r.status !== 'ASSIGNED').length || 0
  const qaReviewed = reports?.filter(r => r.status === 'PUBLISHED').length || 0

  let totalPassed = 0
  let totalFailed = 0

  // 🎯 Boss's Master Summary Logic
  const masterStats: Record<string, any> = {}

  const enrichedReports = reports?.map((r: any) => {
    const qaName = profileMap[r.evaluations?.created_by] || 'Admin'
    const site = r.agent?.site || 'N/A'
    r.qaName = qaName 
    
    // Cap Score at 100%
    if (r.overall_score !== null && r.overall_score > 100) r.overall_score = 100 
    const isPass = r.overall_score !== null && r.overall_score >= r.evaluations?.passing_score

    if (r.overall_score !== null) {
      if (isPass) totalPassed++
      else totalFailed++
    }

    // 📊 Master Data Aggregation
    const key = `${qaName}-${site}`
    if (!masterStats[key]) {
      masterStats[key] = { qaName, site, initialAssigned: 0, initialPass: 0, initialFail: 0, reassignTotal: 0, reassignPass: 0, reassignFail: 0 }
    }

    const isReassigned = r.attempt_type === 'Reassigned'

    if (!isReassigned) {
      masterStats[key].initialAssigned += 1
      if (r.overall_score !== null) {
        if (isPass) masterStats[key].initialPass += 1
        else masterStats[key].initialFail += 1
      }
    } else {
      masterStats[key].reassignTotal += 1
      if (r.overall_score !== null) {
        if (isPass) masterStats[key].reassignPass += 1
        else masterStats[key].reassignFail += 1
      }
    }

    return r
  }) || []
  
  const masterReportArray = Object.values(masterStats)

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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Total Assigned</p><p className="text-3xl font-black text-gray-900">{total}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Agent Submitted</p><p className="text-3xl font-black text-blue-600">{agentCompleted}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">QA Reviewed</p><p className="text-3xl font-black text-emerald-600">{qaReviewed}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/50"><p className="text-sm text-emerald-700 font-bold">Total Passed</p><p className="text-3xl font-black text-emerald-600">{totalPassed}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 bg-red-50/50"><p className="text-sm text-red-700 font-bold">Total Failed</p><p className="text-3xl font-black text-red-600">{totalFailed}</p></div>
        </div>

        {/* 👑 Boss's Master Report (QA & Site Wise with Reassign Stats) */}
        {masterReportArray.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden">
            <div className="p-5 border-b border-indigo-100 bg-indigo-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-indigo-900 font-poppins">Master Performance Summary (QA & Site Wise)</h2>
                <p className="text-xs text-indigo-700 mt-1">Initial attempts vs Reassigned attempts breakdown</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-gray-500 text-[10px] uppercase font-bold sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 border-b" rowSpan={2}>QA Name</th>
                    <th className="px-4 py-3 border-b" rowSpan={2}>Site</th>
                    <th className="px-4 py-2 text-center border-b border-l bg-gray-50" colSpan={3}>Initial Assessment</th>
                    <th className="px-4 py-2 text-center border-b border-l bg-purple-50" colSpan={3}>Re-Assessment</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-center border-b border-l text-gray-600 bg-gray-50">Assigned</th>
                    <th className="px-3 py-2 text-center border-b text-emerald-600 bg-gray-50">Passed</th>
                    <th className="px-3 py-2 text-center border-b text-red-500 bg-gray-50">Failed</th>
                    <th className="px-3 py-2 text-center border-b border-l text-purple-600 bg-purple-50">Assigned</th>
                    <th className="px-3 py-2 text-center border-b text-emerald-600 bg-purple-50">Passed</th>
                    <th className="px-3 py-2 text-center border-b text-red-500 bg-purple-50">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {masterReportArray.map((data: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">{data.qaName}</td>
                      <td className="px-4 py-3 text-xs font-bold text-blue-600">{data.site}</td>
                      
                      {/* Initial Stats */}
                      <td className="px-3 py-3 text-xs font-bold text-center border-l bg-gray-50/30">{data.initialAssigned}</td>
                      <td className="px-3 py-3 text-xs font-bold text-center text-emerald-600 bg-gray-50/30">{data.initialPass}</td>
                      <td className="px-3 py-3 text-xs font-bold text-center text-red-500 bg-gray-50/30">{data.initialFail}</td>
                      
                      {/* Reassign Stats */}
                      <td className="px-3 py-3 text-xs font-bold text-center border-l text-purple-700 bg-purple-50/30">{data.reassignTotal}</td>
                      <td className="px-3 py-3 text-xs font-bold text-center text-emerald-600 bg-purple-50/30">{data.reassignPass}</td>
                      <td className="px-3 py-3 text-xs font-bold text-center text-red-500 bg-purple-50/30">{data.reassignFail}</td>
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
