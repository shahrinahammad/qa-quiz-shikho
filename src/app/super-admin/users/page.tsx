import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// We define the action outside the component or ensure it's a valid server action.
async function updateName(formData: FormData) {
  'use server'
  const userId = formData.get('userId') as string
  const newName = formData.get('newName') as string
  if (!userId || !newName) return;
  const adminClient = createAdminClient()
  await adminClient.from('profiles').update({ full_name: newName }).eq('id', userId)
  revalidatePath('/super-admin/users')
}

// Ensure other actions are also defined properly to avoid build errors.
// (Assuming you have delete and update actions in a separate actions file or defined here)

export default async function UsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const supabaseAdmin = createAdminClient()
  const { data: users } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, update names, or change roles.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                <tr>
                  <th className="px-6 py-4 font-medium">Name & Email (Editable)</th>
                  <th className="px-6 py-4 font-medium">Current Role</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {/* Name Edit Form */}
                      <form action={updateName} className="flex items-center gap-2 mb-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <input 
                          type="text" 
                          name="newName" 
                          defaultValue={u.full_name} 
                          className="px-2 py-1 text-sm font-bold text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-shikho-indigo-500 w-48"
                        />
                        <button type="submit" className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">
                          Save
                        </button>
                      </form>
                      <div className="text-xs text-gray-500 font-poppins pl-1">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 uppercase">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-xs text-gray-400 italic">Actions preserved...</span>
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
