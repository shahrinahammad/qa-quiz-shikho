'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePasswordAction(formData: FormData) {
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) {
    return redirect('/update-password?error=Passwords do not match')
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return redirect('/login')

  // 1. Update Auth Password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return redirect(`/update-password?error=${encodeURIComponent(updateError.message)}`)

  // 2. Update force_password_change in Profiles
  await supabase.from('profiles').update({ 
    force_password_change: false, 
    temp_password: newPassword 
  }).eq('id', user.id)

  // 3. Redirect to dashboard based on role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || 'agent'

  if (role === 'super_admin') redirect('/super-admin/dashboard')
  if (role === 'qa') redirect('/qa/dashboard')
  redirect('/agent/dashboard')
}
