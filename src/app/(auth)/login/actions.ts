'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = (formData.get('password') as string).trim()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return redirect('/login?message=Could not authenticate user')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, force_password_change')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')

  // 🆕 Jodi user first time login kore (ba reset pass kore), take pass change page e pathabo
  if (profile?.force_password_change) {
    return redirect('/update-password')
  }

  const role = profile?.role || 'agent'
  if (role === 'super_admin') redirect('/super-admin/dashboard')
  if (role === 'qa') redirect('/qa/dashboard')
  
  redirect('/agent/dashboard') 
}
