import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-ambient border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">
              Welcome to Dashboard
            </h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">
              Logged in as: {user.email}
            </p>
          </div>
          
          <form action={async () => {
            'use server'
            const supabaseAuth = createClient()
            await supabaseAuth.auth.signOut()
            redirect('/login')
          }}>
            <button 
              type="submit" 
              className="px-6 py-2 bg-shikho-coral-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm text-sm"
            >
              Sign Out
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Pending Reviews</h3>
            <p className="text-3xl font-bold text-gray-900 font-poppins">12</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Evaluations Today</h3>
            <p className="text-3xl font-bold text-gray-900 font-poppins">4</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Average Score</h3>
            <p className="text-3xl font-bold text-shikho-sunrise-500 font-poppins">78%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
