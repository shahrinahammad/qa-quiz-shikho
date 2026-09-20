import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function UsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const supabaseAdmin = createAdminClient()
  const { data: users } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })

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

  // Action 2: Create User
  const createUser = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string
    const adminClient = createAdminClient()
    const { data } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true })
    if (data.user) {
      await adminClient.from('profiles').upsert({ id: data.user.id, email: email, full_name: fullName, role: role })
    }
    revalidatePath('/super-admin/users')
  }

  // Action 3: Delete User
  const deleteUser = async (formData: FormData) => {
    'use server'
    const userId = formData.get('userId') as string
    const adminClient = createAdminClient()
    await adminClient.from('profiles').delete().eq('id', userId)
    await adminClient.auth.admin.deleteUser(userId)
    revalidatePath('/super-admin/users')
  }

  // Action 4: Update Role
  const updateRole = async (formData: FormData) => {
    'use server'
    const userId = formData.get('userId') as string
    const newRole = formData.get('newRole') as string
    const adminClient = createAdminClient()
    await adminClient.from('profiles').update({ role: newRole }).eq('id', userId)
    revalidatePath('/super-admin/users')
  }

  // Action 5: Reset Password
  const resetPassword = async (formData: FormData) => {
    'use server'
    const userId = formData.get('userId') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(userId, { password: 'Password@123' })
    revalidatePath('/super-admin/users')
  }

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, reset passwords, change roles, or remove accounts.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Create User Form (রিকভার করা হয়েছে) */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Create New User</h2>
            <form action={createUser} className="space-y-4">
              <input type="text" name="fullName" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500" placeholder="Full Name" />
              <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500" placeholder="Email Address" />
              <input type="text" name="password" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500" defaultValue="Shikho@123" />
              <select name="role" required className="w-full px-4 py-2 rounded-lg border text-sm font-poppins focus:ring-2 focus:ring-shikho-indigo-500 bg-white">
                <option value="agent">Agent (Trainee)</option>
                <option value="qa">QA</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-bold hover:bg-shikho-indigo-700 mt-4 shadow-sm">
                Create Account
              </button>
            </form>
          </div>

          {/* Users List Table */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">All Users</h2>
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
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      
                      {/* Name Edit Option */}
                      <td className="px-6 py-4">
                        <form action={updateName} className="flex items-center gap-2 mb-1">
                          <input type="hidden" name="userId" value={u.id} />
                          <input 
                            type="text" 
                            name="newName" 
                            defaultValue={u.full_name} 
                            className="px-2 py-1 text-sm font-bold text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-shikho-indigo-500 w-40"
                          />
                          <button type="submit" className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 transition-colors">
                            Save
                          </button>
                        </form>
                        <div className="text-xs text-gray-500 font-poppins pl-1">{u.email}</div>
                      </td>
                      
                      {/* Role Display */}
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 uppercase">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      
                      {/* Change Role Form */}
                      <td className="px-6 py-4">
                        <form action={updateRole} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <select name="newRole" defaultValue={u.role} className="text-xs border border-gray-200 rounded p-1 bg-white focus:outline-none">
                            <option value="agent">Agent</option>
                            <option value="qa">QA</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <button type="submit" className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors">Update</button>
                        </form>
                      </td>
                      
                      {/* Reset Pass & Delete Buttons (রিকভার করা হয়েছে) */}
                      <td className="px-6 py-4 text-right flex justify-end gap-2 mt-2">
                        <form action={resetPassword}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors">
                            Reset Pass
                          </button>
                        </form>
                        <form action={deleteUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors">
                            Delete
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
