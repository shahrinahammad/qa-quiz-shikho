import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Navbar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
    
  const role = profile?.role || 'agent'

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm font-poppins sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        <div className="flex items-center gap-10">
          <Link href={`/${role === 'super_admin' ? 'super-admin' : role}/dashboard`}>
            <Image src="/logo.png" alt="Shikho Logo" width={90} height={30} className="object-contain cursor-pointer" priority />
          </Link>
          
          <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            {role === 'super_admin' && (
              <>
                <Link href="/super-admin/dashboard" className="hover:text-shikho-indigo-600">Dashboard</Link>
                <Link href="/super-admin/users" className="hover:text-shikho-indigo-600">Users</Link>
                <Link href="/super-admin/question-bank" className="hover:text-shikho-indigo-600">Question Bank</Link>
                <Link href="/super-admin/evaluations" className="hover:text-shikho-indigo-600">Evaluations</Link>
                <Link href="/qa/dashboard" className="hover:text-shikho-magenta-500">Review Queue</Link>
                <Link href="/agent/dashboard" className="hover:text-shikho-sunrise-500">Agent View</Link>
              </>
            )}
            {role === 'qa' && (
              <>
                <Link href="/qa/dashboard" className="hover:text-shikho-indigo-600">Dashboard</Link>
                {/* QA-এর জন্য নতুন লিংক */}
                <Link href="/qa/users" className="hover:text-shikho-indigo-600">Agent Management</Link>
                <Link href="/super-admin/question-bank" className="hover:text-shikho-indigo-600">Question Bank</Link>
                <Link href="/super-admin/evaluations" className="hover:text-shikho-indigo-600">Evaluations</Link>
              </>
            )}
            {role === 'agent' && (
              <>
                <Link href="/agent/dashboard" className="hover:text-shikho-indigo-600">My Evaluations</Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
            {role.replace('_', ' ')}
          </span>
          <form action={async () => {
            'use server'
            const supabaseAuth = createClient()
            await supabaseAuth.auth.signOut()
            redirect('/login')
          }}>
            <button type="submit" className="text-sm font-medium text-shikho-coral-500 hover:text-red-600">
              Sign Out
            </button>
          </form>
        </div>
        
      </div>
    </nav>
  )
}
