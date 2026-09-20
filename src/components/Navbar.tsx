import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PushNotificationManager from './PushNotificationManager'
import NotificationBell from './NotificationBell'

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
  const supabaseAdmin = createAdminClient()
  
  let notificationsList: any[] = []
  const dashboardLink = `/${role === 'super_admin' ? 'super-admin' : role}/dashboard`

  const formatBST = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', { 
      timeZone: 'Asia/Dhaka', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    })
  }

  // 1. Fetch all profiles for quick mapping (To get Assigner QA Name correctly)
  const { data: allProfiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = allProfiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

  if (role === 'agent') {
    const { data: agentTasks } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*, evaluations!inner(title, created_by)')
      .eq('agent_id', user.id)
      .in('status', ['ASSIGNED', 'PUBLISHED'])
      .order('created_at', { ascending: false })
      .limit(15)
    
    notificationsList = agentTasks?.map(t => {
      const isReviewed = t.status === 'PUBLISHED'
      const qaName = profileMap[t.evaluations?.created_by] || 'QA' // Fixed Assigner Name
      return {
        text: isReviewed 
          ? `🎉 <strong>${qaName}</strong> finished reviewing your exam: <span className="italic text-green-600">${t.evaluations?.title}</span>`
          : `📝 <strong>${qaName}</strong> assigned a new assessment to you: <span className="italic text-shikho-magenta-600">${t.evaluations?.title}</span>`,
        timeStr: isReviewed && t.submitted_at ? t.submitted_at : t.created_at,
        time: formatBST(isReviewed && t.submitted_at ? t.submitted_at : t.created_at)
      }
    })?.sort((a, b) => new Date(b.timeStr).getTime() - new Date(a.timeStr).getTime()) || []
    
  } else {
    const { data: qaTasks } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*, evaluations!inner(title, created_by), agent:profiles!evaluation_attempts_agent_id_fkey(full_name)')
      .in('status', ['UNDER_QA_REVIEW', 'RECHECK_REQUESTED'])
      .order('submitted_at', { ascending: false })
      .limit(10)

    const { data: assignedTasks } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('*, evaluations!inner(title, created_by), agent:profiles!evaluation_attempts_agent_id_fkey(full_name)')
      .eq('status', 'ASSIGNED')
      .order('created_at', { ascending: false })
      .limit(10)

    const allNotifs = [
      ...(qaTasks || []).map(t => ({
        text: t.status === 'RECHECK_REQUESTED' 
          ? `⚠️ <strong>${t.agent?.full_name || 'Agent'}</strong> requested a recheck for <span className="italic text-orange-600">${t.evaluations?.title}</span>`
          : `✅ <strong>${t.agent?.full_name || 'Agent'}</strong> submitted <span className="italic text-blue-600">${t.evaluations?.title}</span>`,
        timeStr: t.submitted_at || t.created_at,
        time: formatBST(t.submitted_at || t.created_at)
      })),
      ...(assignedTasks || []).map(t => {
        const qaName = profileMap[t.evaluations?.created_by] || 'QA' // Fixed Assigner Name
        return {
          text: `📝 <strong>${qaName}</strong> assigned <span className="italic text-shikho-magenta-600">${t.evaluations?.title}</span> to <strong>${t.agent?.full_name || 'Agent'}</strong>`,
          timeStr: t.created_at,
          time: formatBST(t.created_at)
        }
      })
    ].sort((a, b) => new Date(b.timeStr).getTime() - new Date(a.timeStr).getTime()).slice(0, 15)
    
    notificationsList = allNotifs
  }

  return (
    <>
      <PushNotificationManager userId={user.id} />
      
      <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm font-poppins sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-10">
            <Link href={dashboardLink}>
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
                  <Link href="/agent/dashboard" className="hover:text-shikho-sunrise-500 transition-colors">Agent View</Link> {/* Fixed Agent View Link */}
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
                <Link href="/agent/dashboard" className="hover:text-shikho-indigo-600 transition-colors">My Evaluations</Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <NotificationBell 
              notifications={notificationsList} 
              dashboardLink={role === 'super_admin' ? '/super-admin/dashboard' : dashboardLink} 
            />

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
