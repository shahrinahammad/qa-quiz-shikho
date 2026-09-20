import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PushNotificationManager from './PushNotificationManager'

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

  // 🔔 Notification Engine: Automatically calculates pending actions
  const supabaseAdmin = createAdminClient()
  let notifCount = 0
  let notifLink = `/${role === 'super_admin' ? 'super-admin' : role}/dashboard`

  if (role === 'agent') {
    // Agent Notification: Assigned but not submitted yet
    const { count } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', user.id)
      .eq('status', 'ASSIGNED')
    
    notifCount = count || 0
  } else {
    // QA & Super Admin Notification: Exams waiting for review or recheck
    let query = supabaseAdmin
      .from('evaluation_attempts')
      .select('id, evaluations!inner(created_by)', { count: 'exact', head: true })
      .in('status', ['UNDER_QA_REVIEW', 'RECHECK_REQUESTED'])

    // QA will only see notifications for exams they assigned
    if (role === 'qa') {
      query = query.eq('evaluations.created_by', user.id)
      notifLink = '/qa/dashboard'
    } else {
      notifLink = '/qa/dashboard' // Super Admin can see all in Review Queue
    }

    const { count } = await query
    notifCount = count || 0
  }

  return (
    <>
      {/* 🚀 Background Push Notification Manager */}
      <PushNotificationManager userId={user.id} />
      
      <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm font-poppins sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-10">
            <Link href={`/${role === 'super_admin' ? 'super-admin' : role}/dashboard`}>
              <Image src="/logo.png" alt="Shikho Logo" width={90} height={30} className="object-contain cursor-pointer" priority />
            </Link>
            
            <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
              {role === 'super_admin' && (
                <>
                  <Link href="/super-admin/dashboard" className="hover:text-shikho-indigo-600 transition-colors">Dashboard</Link>
                  <Link href="/super-admin/users" className="hover:text-shikho-indigo-600 transition-colors">Users</Link>
                  <Link href="/super-admin/question-bank" className="hover:text-shikho-indigo-600 transition-colors">Question Bank</Link>
                  <Link href="/super-admin/evaluations" className="hover:text-shikho-indigo-600 transition-colors">Evaluations</Link>
                  <Link href="/qa/dashboard" className="hover:text-shikho-magenta-500 transition-colors">Review Queue</Link>
                  <Link href="/agent/dashboard" className="hover:text-shikho-sunrise-500 transition-colors">Agent View</Link>
                </>
              )}
              {role === 'qa' && (
                <>
                  <Link href="/qa/dashboard" className="hover:text-shikho-magenta-500 transition-colors">Dashboard</Link>
                  <Link href="/qa/users" className="hover:text-shikho-magenta-500 transition-colors">Agent Management</Link>
                  <Link href="/super-admin/question-bank" className="hover:text-shikho-indigo-600 transition-colors">Question Bank</Link>
                  <Link href="/super-admin/evaluations" className="hover:text-shikho-indigo-600 transition-colors">Evaluations</Link>
                </>
              )}
              {role === 'agent' && (
                <>
                  <Link href="/agent/dashboard" className="hover:text-shikho-indigo-600 transition-colors">My Evaluations</Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            
            {/* 🔔 Dynamic Notification Bell */}
            <Link href={notifLink} className="relative p-1.5 rounded-full hover:bg-gray-50 transition-colors cursor-pointer" title="Notifications">
              <span className="text-xl">🔔</span>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                  {notifCount}
                </span>
              )}
            </Link>

            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full uppercase tracking-wider hidden sm:block">
              {role.replace('_', ' ')}
            </span>
            
            <form action={async () => {
              'use server'
              const supabaseAuth = createClient()
              await supabaseAuth.auth.signOut()
              redirect('/login')
            }}>
              <button type="submit" className="text-sm font-bold text-shikho-coral-500 hover:text-red-600 transition-colors">
                Sign Out
              </button>
            </form>
          </div>
          
        </div>
      </nav>
    </>
  )
}
