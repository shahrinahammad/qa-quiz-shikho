import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardRedirect() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // লগিন করা না থাকলে লগিন পেজে পাঠাবে
  if (!user) {
    redirect('/login')
  }

  // ইউজারের রোল চেক করবে
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'agent'

  // রোল অনুযায়ী তার আসল ড্যাশবোর্ডে পাঠিয়ে দেবে
  if (role === 'super_admin') {
    redirect('/super-admin/dashboard')
  } else if (role === 'qa') {
    redirect('/qa/dashboard')
  } else {
    redirect('/agent/dashboard')
  }
}
