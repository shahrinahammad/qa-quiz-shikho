import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUser, resetUserPassword, updateUserRole, deleteUser } from './actions'
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

  // অ্যাডমিন চাবি ব্যবহার করে সব ইউজার আনা হচ্ছে
  const supabaseAdmin = createAdminClient()
  const { data: allUsers } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">User Management</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">Manage users, reset passwords, change roles, or remove accounts.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Create New User</h2>
            {searchParams.success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{searchParams.success}</div>}
            {searchParams.error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{searchParams.error}</div>}

            <form action={createUser} className="space-y-4">
              <input type="text" name="fullName" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-indigo-500 text-sm" placeholder="Full Name" />
              <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-indigo-500 text-sm" placeholder="Email Address" />
              <input type="text" name="password" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-indigo-500 text-sm" defaultValue="Shikho@123" />
              <select name="role" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-shikho-indigo-500 text-sm bg-white">
                <option value="agent">Agent (Trainee)</option>
                <option value="qa">QA (Evaluator)</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 mt-4">Create Account</button>
            </form>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900 font-poppins">All Users</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                    <th className="px-6 py-4 font-medium">Name & Email</th>
                    <th className="px-6 py-4 font-medium">Current Role</th>
                    <th className="px-6 py-4 font-medium">Change Role</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers?.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{u.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'super_admin' ? 'bg-shikho-magenta-500/10 text-shikho-magenta-500' : u.role === 'qa' ? 'bg-shikho-sunrise-500/10 text-shikho-sunrise-500' : 'bg-shikho-indigo-50 text-shikho-indigo-600'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.id !== user.id && (
                          <form action={updateUserRole} className="flex gap-2 items-center">
                            <input type="hidden" name="userId" value={u.id} />
                            <select name="role" defaultValue={u.role} className="px-2 py-1 border rounded text-xs">
                              <option value="agent">Agent</option>
                              <option value="qa">QA</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                            <button type="submit" className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">Update</button>
                          </form>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <form action={resetUserPassword}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="newPassword" value="Shikho@123" />
                          <button type="submit" title="Reset to Shikho@123" className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Reset Pass</button>
                        </form>
                        {u.id !== user.id && (
                          <form action={deleteUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            {/* onClick ইভেন্টটি এখান থেকে রিমুভ করা হয়েছে */}
                            <button type="submit" className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100">Delete</button>
                          </form>
                        )}
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
