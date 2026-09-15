import { createClient } from '@/lib/supabase/server'
import { createUser, resetUserPassword } from './actions'
import { redirect } from 'next/navigation'

export default async function SuperAdminUsersPage({ 
  searchParams 
}: { 
  searchParams: { error?: string, success?: string } 
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: allUsers } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">User Management</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">Create and manage internal platform users. Default passwords can be set here.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create User Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Create New User</h2>
            
            {searchParams.success && (
              <div className="mb-4 p-4 bg-green-50 text-green-800 text-sm rounded-lg border border-green-200 font-medium font-poppins break-words">
                {searchParams.success}
              </div>
            )}
            
            {searchParams.error && (
              <div className="mb-4 p-4 bg-red-50 text-shikho-coral-500 text-sm rounded-lg border border-red-200 font-medium font-poppins break-words">
                {searchParams.error}
              </div>
            )}

            <form action={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Full Name</label>
                <input type="text" name="fullName" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins" placeholder="Siam Mollah" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Email Address</label>
                <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins" placeholder="agent@shikho.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Initial Password</label>
                <input type="text" name="password" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins" defaultValue="Shikho@123" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Role</label>
                <select name="role" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins bg-white">
                  <option value="agent">Agent (Trainee)</option>
                  <option value="qa">QA (Evaluator)</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors mt-4">
                Create Account
              </button>
            </form>
          </div>

          {/* Users List with Reset Password Action */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">All Platform Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers?.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 font-poppins">{u.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500 font-poppins mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium font-poppins ${
                          u.role === 'super_admin' ? 'bg-shikho-magenta-500/10 text-shikho-magenta-500' :
                          u.role === 'qa' ? 'bg-shikho-sunrise-500/10 text-shikho-sunrise-500' :
                          'bg-shikho-indigo-50 text-shikho-indigo-600'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={resetUserPassword}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="newPassword" value="Shikho@123" />
                          <button type="submit" className="text-xs font-medium text-shikho-coral-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-poppins">
                            Reset Password
                          </button>
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
    </div>
  )
}
