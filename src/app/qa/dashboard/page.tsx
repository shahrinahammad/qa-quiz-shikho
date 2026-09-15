import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function QADashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-shikho-magenta-500 font-poppins">QA Workspace</h1>
            <p className="text-gray-500 text-sm mt-1">Review evaluations and provide feedback.</p>
          </div>
          <form action={async () => { 'use server'; const supabaseAuth = createClient(); await supabaseAuth.auth.signOut(); redirect('/login'); }}>
            <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200">Sign Out</button>
          </form>
        </header>
        <div className="p-10 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 font-poppins">Pending reviews will appear here.</p>
        </div>
      </div>
    </div>
  )
}
