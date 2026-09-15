'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return redirect(`/super-admin/users?error=${error.message}`)
  }

  // Upsert ব্যবহার করা হলো যাতে ডাটাবেসে ইউজার শো করতে কোনো সমস্যা না হয়
  if (data.user) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role
      })

    if (profileError) {
      return redirect(`/super-admin/users?error=${profileError.message}`)
    }
  }

  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User created successfully!')
}

// নতুন পাসওয়ার্ড রিসেট ফাংশন
export async function resetUserPassword(formData: FormData) {
  const userId = formData.get('userId') as string
  const newPassword = formData.get('newPassword') as string

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) {
    return redirect(`/super-admin/users?error=Password reset failed: ${error.message}`)
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Password successfully reset to: ${newPassword}`)
}
// রোল পরিবর্তন করার ফাংশন
export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as string
  
  const supabaseAdmin = createAdminClient()
  await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User role updated successfully!')
}

// আইডি ডিলিট করার ফাংশন
export async function deleteUser(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  
  // ১. প্রোফাইল থেকে ডিলিট
  await supabaseAdmin.from('profiles').delete().eq('id', userId)
  // ২. সিস্টেম (Auth) থেকে ডিলিট
  await supabaseAdmin.auth.admin.deleteUser(userId)
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User deleted successfully!')
}
