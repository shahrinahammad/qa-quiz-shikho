'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin' // 🆕 অ্যাডমিন ক্লায়েন্ট ইম্পোর্ট করা হলো
import { redirect } from 'next/navigation'

export async function updatePasswordAction(formData: FormData) {
  const newPassword = (formData.get('newPassword') as string).trim()
  const confirmPassword = (formData.get('confirmPassword') as string).trim()

  if (newPassword !== confirmPassword) {
    return redirect('/update-password?error=Passwords do not match')
  }

  if (newPassword.length < 6) {
    return redirect('/update-password?error=Password must be at least 6 characters long')
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return redirect('/login')

  // ১. Supabase Auth-এ ইউজারের পাসওয়ার্ড আপডেট করা
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return redirect(`/update-password?error=${encodeURIComponent(updateError.message)}`)

  // 🛠️ FIXED: অ্যাডমিন এক্সেস ব্যবহার করে Profiles টেবিলে আপডেট করা হচ্ছে, যাতে সিকিউরিটি পলিসিতে না আটকায়
  const supabaseAdmin = createAdminClient()
  await supabaseAdmin.from('profiles').update({ 
    force_password_change: false, 
    temp_password: newPassword 
  }).eq('id', user.id)

  // ৩. ইউজারের রোল অনুযায়ী সঠিক ড্যাশবোর্ডে রিডাইরেক্ট করা
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || 'agent'

  if (role === 'super_admin') redirect('/super-admin/dashboard')
  if (role === 'qa') redirect('/qa/dashboard')
  redirect('/agent/dashboard')
}
