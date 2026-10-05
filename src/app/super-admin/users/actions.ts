'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendAgentCredentialEmail } from '@/lib/mail'

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
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role,
        temp_password: password
      })
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

  await supabaseAdmin.from('profiles').update({ temp_password: newPassword }).eq('id', userId)

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=${encodeURIComponent('Password reset to: ' + newPassword)}`)
}

// ৩. রোল পরিবর্তন
export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as string
  
  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
  
  if (error) return redirect(`/super-admin/users?error=${encodeURIComponent('Failed to update role: ' + error.message)}`)
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User role updated successfully!')
}

// ৪. ইউজার ডিলিট
export async function deleteUser(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (profileError) return redirect(`/super-admin/users?error=${encodeURIComponent('Cannot delete this user. They might have exam records linked to them.')}`)

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) return redirect(`/super-admin/users?error=${encodeURIComponent(authError.message)}`)
  
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User deleted successfully!')
}

// ৫. বাল্ক ইউজার তৈরি (CSV Upload)
export async function createBulkUsers(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return redirect('/super-admin/users?error=No file uploaded')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = user?.email || ''

  const text = await file.text()
  const rows = text.split('\n').filter(row => row.trim() !== '')

  const supabaseAdmin = createAdminClient()
  let successCount = 0
  let existCount = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.toLowerCase().includes('email')) continue;

    const columns = row.split(',').map(c => c.trim())
    
    if (columns.length >= 2) {
      const email = columns[0]
      const fullName = columns[1]
      const password = columns[2] || 'Shikho@123' 
      const role = columns[3] ? columns[3].toLowerCase() : 'agent' 

      if (email) {
        const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single()
        
        if (existingUser) {
          existCount++
          continue
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true,
        })

        if (!error && data?.user) {
          await supabaseAdmin.from('profiles').upsert({
            id: data.user.id, email: email, full_name: fullName, role: role, temp_password: password 
          })
          
          try {
            await sendAgentCredentialEmail(email, adminEmail, fullName, password)
          } catch (mailErr) {
            console.error('Mail sending failed for:', email)
          }

          successCount++
        } else {
          errorCount++
        }
      }
    }
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Created: ${successCount} | Already Exists: ${existCount} | Failed: ${errorCount}`)
}

// ৬. Individual মেইল পাঠানো
export async function sendIndividualEmailAction(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = user?.email || ''

  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
  if (!profile) return redirect('/super-admin/users?error=User not found')

  const pass = profile.temp_password || 'Shikho@123'
  
  try {
    await sendAgentCredentialEmail(profile.email, adminEmail, profile.full_name, pass)
    return redirect('/super-admin/users?success=Email sent successfully to ' + profile.email)
  } catch (e) {
    return redirect('/super-admin/users?error=Failed to send email')
  }
}

// ৭. সবাইকে একসাথে মেইল পাঠানো (Send to ALL)
export async function sendBulkEmailsToAllAction() {
  const supabaseAdmin = createAdminClient()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = user?.email || ''

  // শুধুমাত্র এজেন্টদের আনা হচ্ছে
  const { data: agents } = await supabaseAdmin.from('profiles').select('*').eq('role', 'agent')
  if (!agents || agents.length === 0) return redirect('/super-admin/users?error=No agents found')

  let sent = 0
  for (const agent of agents) {
    const pass = agent.temp_password || 'Shikho@123'
    try {
      await sendAgentCredentialEmail(agent.email, adminEmail, agent.full_name, pass)
      sent++
    } catch(e) {
      console.error('Failed for', agent.email)
    }
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Successfully sent emails to ${sent} agents!`)
}
