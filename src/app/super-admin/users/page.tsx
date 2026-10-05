import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
  createUser,
  resetUserPassword,
  updateUserRole,
  deleteUser,
  createBulkUsers, 
  sendIndividualEmailAction, 
  sendBulkEmailsToAllAction 
} from './actions' 

export default async function UsersPage({ searchParams }: { searchParams: { error?: string, success?: string, q?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const searchQuery = searchParams?.q || ''
  const supabaseAdmin = createAdminClient()
  
  // ডেটাবেস থেকে সব ইউজার আনা
  const { data: allUsers } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })
  
  // সার্চ কোয়েরি অনুযায়ী ফিল্টার করা
  const users = allUsers?.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Action 1: Update Name 
  const updateName = async (formData: FormData) => {
    'use server'
    const userId = formData.get('userId') as string
    const newName = formData.get('newName') as string
    if (!userId || !newName) return
    const adminClient = createAdminClient()
    await adminClient.from('profiles').update({ full_name: newName }).eq('id', userId)
    revalidatePath('/super-admin/users')
  }

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">User Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage users, reset passwords, change roles, or remove accounts.</p>
          </div>
          
          {/* Send to ALL Button */}
          <form action={sendBulkEmailsToAllAction}>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors">
              ✉️ Send ID/Pass to ALL Agents
            </button>
          </form>
        </header>

        {searchParams.success && <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg font-poppins font-bold">{searchParams.success}</div>}
        {searchParams.error && <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-poppins font-bold">{searchParams.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column: Forms */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Single User */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Create New User</h2>
              <form action={createUser} className="space-y-4">
                <input type="text" name="fullName" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500" placeholder="Full Name" />
                <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500" placeholder="Email Address" />
                
                {/* 🛑 Password input box ti eখান theke shoriye deya hoyeche */}
                
                <select name="role" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500 bg-white">
                  <option value="agent">Agent (Trainee)</option>
                  <option value="qa">QA</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-bold hover:bg-shikho-indigo-700 mt-4 shadow-sm">
                  Create Account (Auto Password)
                </button>
              </form>
            </div>

            {/* Bulk Create User */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 h-fit">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-green-700 font-poppins">Bulk Create</h2>
                <a href="/api/export-users" className="text-[10px] font-bold bg-shikho-indigo-50 text-shikho-indigo-600 px-2 py-1 rounded hover:bg-shikho-indigo-100 transition-colors border border-shikho-indigo-200">
                  📄 Export Passwords
                </a>
              </div>
              <div className="flex gap-2 mb-4">
                {/* 🛑 Password chara new Download link */}
                <a href="data:text/csv;charset=utf-8,Email,Name,Role%0Aagent1@shikho.com,John Doe,agent" download="shikho_users_template.csv" className="text-[10px] font-bold text-gray-500 hover:text-green-600 hover:underline">
                  Download Demo CSV (No Password)
                </a>
              </div>
              <form action={createBulkUsers} className="space-y-4">
                <input type="file" name="file" accept=".csv" required className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" />
                <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-poppins font-bold hover:bg-green-700 shadow-sm">
                  Upload & Create Users
                </button>
              </form>
            </div>
          </div>

          {/* Users List Table with Search */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">All Users</h2>
              
              {/* 🔍 Search Bar */}
              <form method="GET" className="flex w-full md:w-auto gap-2">
                <input 
                  type="text" 
                  name="q" 
                  defaultValue={searchQuery} 
                  placeholder="Search by name or email..." 
                  className="w-full md:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-shikho-indigo-500 font-poppins" 
                />
                <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 font-poppins">Search</button>
                {searchQuery && (
                  <a href="/super-admin/users" className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center font-poppins">
                    Clear
                  </a>
                )}
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name & Email</th>
                    <th className="px-6 py-4 font-medium">Current Role</th>
                    <th className="px-6 py-4 font-medium">Change Role</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500 text-sm font-poppins">No users found.</td>
                    </tr>
                  ) : (
                    users?.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <form action={updateName} className="flex items-center gap-2 mb-1">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="text" name="newName" defaultValue={u.full_name} className="px-2 py-1 text-sm font-bold text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-shikho-indigo-500 w-40 font-poppins" />
                            <button type="submit" className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 transition-colors">Save</button>
                          </form>
                          <div className="text-xs text-gray-500 font-poppins pl-1">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 uppercase font-poppins">
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <form action={updateUserRole} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <select name="role" defaultValue={u.role} className="text-xs border border-gray-200 rounded p-1 bg-white focus:outline-none font-poppins">
                              <option value="agent">Agent</option>
                              <option value="qa">QA</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                            <button type="submit" className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors">Update</button>
                          </form>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <form action={sendIndividualEmailAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <button type="submit" className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors font-poppins">
                                ✉️ Email
                              </button>
                            </form>
                            <form action={resetUserPassword}>
                              <input type="hidden" name="userId" value={u.id} />
                              <button type="submit" className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors font-poppins">Reset Pass</button>
                            </form>
                            <form action={deleteUser}>
                              <input type="hidden" name="userId" value={u.id} />
                              <button type="submit" className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors font-poppins">Delete</button>
                            </form>
                          </div>
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
