import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function SuperAdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 🔒 Security Lock: সুপার অ্যাডমিন ছাড়া কেউ ঢুকতে পারবে না
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const supabaseAdmin = createAdminClient()
  const { data: reports } = await supabaseAdmin
    .from('evaluation_attempts')
    .select(`*, evaluations(title, passing_score), agent:profiles!evaluation_attempts_agent_id_fkey(full_name), qa:profiles!evaluation_attempts_qa_id_fkey(full_name)`)
    .order('created_at', { ascending: false })

  // Dynamic Stats
  const total = reports?.length || 0
  const pending = reports?.filter(r => r.status === 'UNDER_QA_REVIEW').length || 0
  const published = reports?.filter(r => r.status === 'PUBLISHED').length || 0
  const disputes = reports?.filter(r => r.status === 'RECHECK_REQUESTED').length || 0

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Super Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview and dynamic team reports.</p>
        </header>
        
        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Total Exams</p><p className="text-3xl font-black text-gray-900">{total}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Pending QA</p><p className="text-3xl font-black text-blue-600">{pending}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Published</p><p className="text-3xl font-black text-green-600">{published}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 font-bold">Disputes</p><p className="text-3xl font-black text-orange-600">{disputes}</p></div>
        </div>

        {/* Detailed Reporting Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900 font-poppins">Detailed Evaluations Report</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                  <th className="px-6 py-4 font-medium">Exam Title</th>
                  <th className="px-6 py-4 font-medium">Agent Name</th>
                  <th className="px-6 py-4 font-medium">Evaluated By (QA)</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.evaluations?.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.agent?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-shikho-magenta-600">{row.qa?.full_name || 'Pending...'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.overall_score !== null ? `${row.overall_score}%` : '-'}</td>
                    <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-xs font-medium font-poppins ${row.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : row.status === 'RECHECK_REQUESTED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                         {row.status.replace(/_/g, ' ')}
                       </span>
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
