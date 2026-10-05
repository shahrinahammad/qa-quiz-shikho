'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  
  // 🛠️ FIXED: ইমেইলকে ছোট হাতের (lowercase) এবং স্পেস-মুক্ত (trim) করা হলো
  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return redirect('/login?message=Could not authenticate user')
  }

  // ইউজারের রোল বের করা
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profile?.role || 'agent'

  revalidatePath('/', 'layout')

  // রোল অনুযায়ী সঠিক ড্যাশবোর্ডে পাঠানো
  if (role === 'super_admin') redirect('/super-admin/dashboard')
  if (role === 'qa') redirect('/qa/dashboard')
  
  redirect('/agent/dashboard') 
}
