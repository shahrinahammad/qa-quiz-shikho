import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'

export default async function ImpactReportPage({
  searchParams
}: {
  searchParams: { from?: string, to?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  const today = new Date()
  let defaultTo = new Date(today)
  while (defaultTo.getDay() !== 5) {
    defaultTo.setDate(defaultTo.getDate() - 1)
  }
  
  let defaultFrom = new Date(defaultTo)
  defaultFrom.setDate(defaultTo.getDate() - 6)

  const fromParam = searchParams.from
  const toParam = searchParams.to

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom
  const toDate = toParam ? new Date(toParam) : defaultTo

  fromDate.setHours(0, 0, 0, 0)
  toDate.setHours(23, 59, 59, 999)

  const { data: reports } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations!inner(title, created_by), qa:profiles!evaluation_attempts_qa_id_fkey(full_name)`)
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  const assigned = reports?.length || 0
  const submitted = reports?.filter(r => r.status !== 'ASSIGNED').length || 0
  const reviewed = reports?.filter(r => r.status === 'PUBLISHED').length || 0

  const qaPerformance: Record<string, any> = {}
  reports?.forEach((r: any) => {
    const assignerId = r.evaluations?.created_by;
    const assignerName = profileMap[assignerId] || 'Admin';

    if (!qaPerformance[assignerId]) {
      qaPerformance[assignerId] = { name: assignerName, assign: 0, submit: 0, review: 0, score: 0 }
    }
    qaPerformance[assignerId].assign += 1
    if (r.status !== 'ASSIGNED') qaPerformance[assignerId].submit += 1
    if (r.status === 'PUBLISHED') {
      qaPerformance[assignerId].review += 1
      qaPerformance[assignerId].score += (r.overall_score || 0)
    }
  })

  const qaReportArray = Object.values(qaPerformance).map(qa => ({
    ...qa,
    avgScore: qa.review > 0 ? Math.round(qa.score / qa.review) : 0
  }))

  const dateStr = `${fromDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} - ${toDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}`
  
  const fromInputStr = fromDate.toISOString().split('T')[0]
  const toInputStr = toDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50 py-10 flex justify-center">
      
      <div id="impact-report-card" className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">
        
        <div className="text-center pt-8 pb-6 px-6">
          <div className="flex justify-center items-center gap-2 mb-2">
             {/* 🛠️ Next.js Image-এর বদলে স্ট্যান্ডার্ড img ট্যাগ ব্যবহার করা হলো */}
             <img src="/logo.png" alt="Shikho" className="h-8 object-contain mx-auto" crossOrigin="anonymous" />
          </div>
          <p className="text-lg font-black text-shikho-magenta-600 uppercase tracking-widest mt-2 leading-relaxed">
            QA EVAL. REPORT
          </p>
          <p className="text-xs text-gray-400 mt-2 font-medium">{dateStr}</p>
        </div>

        <div className="flex justify-between px-6 pb-6 border-b border-gray-100">
          <div className="text-center">
            <p className="text-[10px] font-bold text-shikho-indigo-600 uppercase tracking-wider mb-1">Assigned</p>
            <p className="text-3xl font-black text-gray-800 leading-none">{assigned}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Submitted</p>
            <p className="text-3xl font-black text-blue-900 leading-none">{submitted}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Reviewed</p>
            <p className="text-3xl font-black text-green-700 leading-none">{reviewed}</p>
          </div>
        </div>

        <div className="bg-shikho-magenta-50/30 p-2">
          <div className="bg-shikho-magenta-100 text-shikho-magenta-700 text-[10px] font-bold uppercase flex justify-between px-6 py-3 rounded-t-xl tracking-wider">
            <span className="w-1/2">QA TEAM</span>
            <span className="w-1/4 text-center">DONE</span>
            <span className="w-1/4 text-right">AVG. SCORE</span>
          </div>
          
          <div className="bg-white">
            {qaReportArray.map((qa, i) => (
              <div key={i} className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                <div className="w-1/2 flex items-center gap-3">
                  <span className="text-gray-400 text-xs mt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                  {/* 🛠️ line-clamp রিমুভ করে truncate ও padding দেওয়া হয়েছে */}
                  <span className="text-sm font-bold text-gray-800 truncate block py-1">{qa.name}</span>
                </div>
                <div className="w-1/4 text-center">
                  <span className="text-sm font-bold text-blue-600">{qa.review}</span>
                  <span className="text-[10px] text-gray-400 ml-1">/{qa.assign}</span>
                </div>
                <div className="w-1/4 text-right">
                  <span className={`text-sm font-bold px-2 py-1.5 rounded inline-block ${qa.avgScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {qa.avgScore}%
                  </span>
                </div>
              </div>
            ))}
            
            {qaReportArray.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-400 font-medium">
                No data available for selected dates.
              </div>
            )}
          </div>
        </div>

        <div className="text-center py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest leading-relaxed">Confidential • Management Report</p>
        </div>
      </div>

      <div className="fixed top-6 left-6 flex flex-col gap-4 print:hidden w-64">
        <Link href="/super-admin/dashboard" className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-center text-sm font-bold shadow-lg hover:bg-gray-800 transition-transform hover:scale-105">
          &larr; Back to Dashboard
        </Link>
        
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-4 uppercase tracking-wider">Report Filter</p>
          <form method="GET" className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From Date</label>
              <input type="date" name="from" defaultValue={fromInputStr} className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-shikho-magenta-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To Date</label>
              <input type="date" name="to" defaultValue={toInputStr} className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-shikho-magenta-500" />
            </div>
            <button type="submit" className="w-full bg-shikho-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-shikho-indigo-700 mt-2">
              Generate Report
            </button>
            {(fromParam || toParam) && (
              <Link href="/super-admin/impact-report" className="text-center text-[10px] font-bold text-red-500 hover:underline pt-2">
                Reset to Last Week
              </Link>
            )}
          </form>
        </div>

        <PrintButton />
      </div>

    </div>
  )
}
