'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ১. নতুন ইউজার তৈরি
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
    return redirect(`/super-admin/users?error=${encodeURIComponent(error.message)}`)
  }

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
      return redirect(`/super-admin/users?error=${encodeURIComponent(profileError.message)}`)
    }
  }

  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User created successfully!')
}

// ২. পাসওয়ার্ড রিসেট
export async function resetUserPassword(formData: FormData) {
  const userId = formData.get('userId') as string
  const newPassword = formData.get('newPassword') as string

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) {
    return redirect(`/super-admin/users?error=${encodeURIComponent('Password reset failed: ' + error.message)}`)
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=${encodeURIComponent('Password reset to: ' + newPassword)}`)
}

// ৩. রোল পরিবর্তন
export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as string
  
  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
  
  if (error) {
    return redirect(`/super-admin/users?error=${encodeURIComponent('Failed to update role: ' + error.message)}`)
  }
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User role updated successfully!')
}

// ৪. ইউজার ডিলিট
export async function deleteUser(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  
  // ১. প্রোফাইল থেকে ডিলিট
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  
  if (profileError) {
    return redirect(`/super-admin/users?error=${encodeURIComponent('Cannot delete this user. They might have exam records linked to them.')}`)
  }

  // ২. সিস্টেম (Auth) থেকে ডিলিট
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (authError) {
    return redirect(`/super-admin/users?error=${encodeURIComponent(authError.message)}`)
  }
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User deleted successfully!')
}

// ৫. বাল্ক ইউজার তৈরি (CSV File Upload থেকে)
export async function createBulkUsers(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return redirect('/super-admin/users?error=No file uploaded')

  // ফাইলটিকে টেক্সটে কনভার্ট করা
  const text = await file.text()
  const rows = text.split('\n').filter(row => row.trim() !== '')

  const supabaseAdmin = createAdminClient()
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    // হেডার লাইন (Email, Name...) ইগনোর করার জন্য
    if (row.toLowerCase().includes('email')) continue;

    const columns = row.split(',').map(c => c.trim())
    
    if (columns.length >= 2) {
      const email = columns[0]
      const fullName = columns[1]
      const password = columns[2] || 'Shikho@123' 
      const role = columns[3] ? columns[3].toLowerCase() : 'agent' 

      if (email) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (!error && data?.user) {
          await supabaseAdmin.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role
          })
          successCount++
        } else {
          errorCount++
        }
      }
    }
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Bulk upload complete! Created: ${successCount}, Failed: ${errorCount}`)
}
