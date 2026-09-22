import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAgent, deleteAgent, createBulkAgents } from './actions' 
import { redirect } from 'next/navigation'

export default async function QAUsersPage({ searchParams }: { searchParams: { error?: string, success?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa') redirect('/dashboard')

  const supabaseAdmin = createAdminClient()
  
  const { data: agents } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'agent')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">Agent Management</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">Create new agents or remove existing ones from your team.</p>
          </div>
        </header>

        {searchParams.success && <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg font-poppins font-bold">{searchParams.success}</div>}
        {searchParams.error && <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-poppins font-bold">{searchParams.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column: Forms */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Create Single Agent */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Create New Agent</h2>
              <form action={createAgent} className="space-y-4">
                <input type="text" name="fullName" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-magenta-500 text-sm font-poppins" placeholder="Agent Full Name" />
                <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-magenta-500 text-sm font-poppins" placeholder="agent@shikho.com" />
                <input type="text" name="password" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-magenta-500 text-sm font-poppins" defaultValue="Shikho@123" />
                <select disabled className="w-full px-4 py-2 rounded-lg border bg-gray-100 text-gray-500 text-sm font-poppins cursor-not-allowed">
                  <option>Role: Agent (Trainee)</option>
                </select>
                <button type="submit" className="w-full bg-shikho-magenta-500 text-white py-2.5 rounded-lg font-poppins font-bold hover:bg-shikho-magenta-600 mt-4 shadow-sm">
                  Create Agent Profile
                </button>
              </form>
            </div>

            {/* 🆕 Bulk Create Agent (CSV Upload) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 h-fit">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-green-700 font-poppins">Bulk Create</h2>
                {/* 📥 Download Demo Button */}
                <a 
                  href="data:text/csv;charset=utf-8,Email,Name,Password%0Aagent1@shikho.com,John Doe,Shikho@123" 
                  download="shikho_agents_template.csv" 
                  className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors border border-green-200"
                >
                  📥 Download Demo
                </a>
              </div>
              <p className="text-[11px] text-gray-500 mb-4 leading-tight">Download the template, fill it in Excel, and upload.</p>
              
              <form action={createBulkAgents} className="space-y-4">
                <input 
                  type="file" 
                  name="file" 
                  accept=".csv" 
                  required 
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" 
                />
                <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-poppins font-bold hover:bg-green-700 shadow-sm">
                  Upload & Create Agents
                </button>
              </form>
            </div>

          </div>

          {/* Agents List Table */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">All Active Agents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                    <th className="px-6 py-4 font-medium">Name & Email</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agents?.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No agents found.</td></tr>
                  ) : (
                    agents?.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{u.full_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 font-poppins mt-0.5">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-shikho-indigo-50 text-shikho-indigo-600 font-poppins">AGENT</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <form action={deleteAgent}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button type="submit" className="text-xs text-red-600 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 font-bold font-poppins transition-colors">Delete Agent</button>
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
    </div>
  )
}
