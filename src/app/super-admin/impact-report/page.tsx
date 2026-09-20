import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PrintButton from './PrintButton'

export default async function ImpactReportPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  // Last 7 days data
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysSinceSaturday = (dayOfWeek + 1) % 7
  
  const lastSaturday = new Date(today)
  lastSaturday.setDate(today.getDate() - daysSinceSaturday - (daysSinceSaturday === 0 && dayOfWeek !== 6 ? 7 : 0))
  lastSaturday.setHours(0, 0, 0, 0)

  const thisFriday = new Date(lastSaturday)
  thisFriday.setDate(lastSaturday.getDate() + 6)
  thisFriday.setHours(23, 59, 59, 999)

  const { data: reports } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`
      *, 
      evaluations!inner(title, created_by), 
      qa:profiles!evaluation_attempts_qa_id_fkey(full_name)
    `)
    .gte('created_at', lastSaturday.toISOString())
    .lte('created_at', thisFriday.toISOString())

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

  const dateStr = `${lastSaturday.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})} - ${thisFriday.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}`

  return (
    <div className="min-h-screen bg-gray-50 py-10 flex justify-center">
      <div id="impact-report-card" className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">
        
        <div className="text-center pt-8 pb-6 px-6">
          <div className="flex justify-center items-center gap-2 mb-2">
             <Image src="/logo.png" alt="Shikho" width={100} height={35} className="object-contain" />
             <span className="text-xl font-bold text-gray-800">Intelligence</span>
          </div>
          <p className="text-sm font-bold text-gray-500 bg-gray-100 inline-block px-4 py-1 rounded-full uppercase tracking-widest mt-2">
            Trials - QA Weekly
          </p>
          <p className="text-xs text-gray-400 mt-2 font-medium">{dateStr}</p>
        </div>

        <div className="flex justify-between px-6 pb-6 border-b border-gray-100">
          <div className="text-center">
            <p className="text-[10px] font-bold text-shikho-indigo-600 uppercase tracking-wider mb-1">Assigned</p>
            <p className="text-3xl font-black text-gray-800">{assigned}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Submitted</p>
            <p className="text-3xl font-black text-blue-900">{submitted}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Reviewed</p>
            <p className="text-3xl font-black text-green-700">{reviewed}</p>
          </div>
        </div>

        <div className="bg-shikho-magenta-50/30 p-2">
          <div className="bg-shikho-magenta-100 text-shikho-magenta-700 text-[10px] font-bold uppercase flex justify-between px-6 py-2 rounded-t-xl tracking-wider">
            <span className="w-1/2">QA TEAM</span>
            <span className="w-1/4 text-center">DONE</span>
            <span className="w-1/4 text-right">AVG. SCORE</span>
          </div>
          
          <div className="bg-white">
            {qaReportArray.map((qa, i) => (
              <div key={i} className="flex justify-between items-center px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="w-1/2 flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="text-sm font-bold text-gray-800 line-clamp-1">{qa.name}</span>
                </div>
                <div className="w-1/4 text-center">
                  <span className="text-sm font-bold text-blue-600">{qa.review}</span>
                  <span className="text-[10px] text-gray-400 ml-1">/{qa.assign}</span>
                </div>
                <div className="w-1/4 text-right">
                  <span className={`text-sm font-bold px-2 py-1 rounded ${qa.avgScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {qa.avgScore}%
                  </span>
                </div>
              </div>
            ))}
            
            {qaReportArray.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-400 font-medium">
                No data available for this week.
              </div>
            )}
          </div>
        </div>

        <div className="text-center py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Confidential • Internal Use Only</p>
        </div>
      </div>

      {/* print:hidden add kora hoyeche jate ei button gulo picture-e na ashe */}
      <div className="fixed top-6 left-6 flex flex-col gap-4 print:hidden">
        <Link href="/super-admin/dashboard" className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-gray-800 transition-transform hover:scale-105">
          &larr; Back to Dashboard
        </Link>
        <PrintButton />
      </div>
    </div>
  )
}
