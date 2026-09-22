'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAgent(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = 'agent' // QA শুধু এজেন্ট তৈরি করতে পারবে, তাই এটি ফিক্সড করে দেওয়া হয়েছে

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

// 🆕 বাল্ক এজেন্ট তৈরি (CSV File Upload থেকে) - শুধুমাত্র QA প্যানেলের জন্য
export async function createBulkAgents(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return redirect('/qa/users?error=No file uploaded')

  const text = await file.text()
  const rows = text.split('\n').filter(row => row.trim() !== '')

  const supabaseAdmin = createAdminClient()
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    // হেডার লাইন ইগনোর করার জন্য
    if (row.toLowerCase().includes('email')) continue;

    const columns = row.split(',').map(c => c.trim())
    
    if (columns.length >= 2) {
      const email = columns[0]
      const fullName = columns[1]
      const password = columns[2] || 'Shikho@123'
      const role = 'agent' // QA শুধু এজেন্ট তৈরি করতে পারে

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

  revalidatePath('/qa/users')
  redirect(`/qa/users?success=Bulk upload complete! Created: ${successCount}, Failed: ${errorCount}`)
}
