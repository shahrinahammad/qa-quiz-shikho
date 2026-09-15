'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  const supabaseAdmin = createAdminClient()

  // ১. Auth-এ ইউজার তৈরি করা
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return redirect(`/super-admin/users?error=${error.message}`)
  }

  // ২. প্রোফাইল টেবিলে নাম এবং রোল আপডেট করা (কারণ ট্রিগার অটোমেটিক এজেন্ট বানিয়েছিল)
  if (data.user) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, role: role })
      .eq('id', data.user.id)

    if (profileError) {
      return redirect(`/super-admin/users?error=${profileError.message}`)
    }
  }

  redirect('/super-admin/users?success=User created successfully!')
}
