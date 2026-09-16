'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAgent(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = 'agent' // QA শুধু এজেন্ট তৈরি করতে পারবে, তাই এটি ফিক্সড করে দেওয়া হয়েছে

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return redirect(`/qa/users?error=${encodeURIComponent(error.message)}`)

  if (data.user) {
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id, email: email, full_name: fullName, role: role
    })
    if (profileError) return redirect(`/qa/users?error=${encodeURIComponent(profileError.message)}`)
  }

  revalidatePath('/qa/users')
  redirect('/qa/users?success=Agent created successfully!')
}

export async function deleteAgent(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  
  // ১. সিকিউরিটি চেক: ডাটাবেস থেকে চেক করা হচ্ছে ইউজারটি আসলেই 'agent' কি না
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  
  if (profile?.role !== 'agent') {
    return redirect(`/qa/users?error=${encodeURIComponent("Permission Denied: You can only delete Agent accounts.")}`)
  }

  // ২. প্রোফাইল ডিলিট
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (profileError) return redirect(`/qa/users?error=${encodeURIComponent("Cannot delete this agent. They might have exam records linked to them.")}`)

  // ৩. সিস্টেম থেকে ডিলিট
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) return redirect(`/qa/users?error=${encodeURIComponent(authError.message)}`)
  
  revalidatePath('/qa/users')
  redirect('/qa/users?success=Agent deleted successfully!')
}
