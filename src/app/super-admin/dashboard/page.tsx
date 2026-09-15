import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Super Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Platform overview and settings.</p>
          </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total Agents</h3>
            <p className="text-3xl font-bold text-gray-900">42</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Active QA</h3>
            <p className="text-3xl font-bold text-gray-900">5</p>
          </div>
        </div>
      </div>
    </div>
  )
}
