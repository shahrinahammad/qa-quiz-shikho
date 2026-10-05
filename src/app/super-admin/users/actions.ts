'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendAgentCredentialEmail } from '@/lib/mail'

// 🆕 Helper: 8 character er dynamic password bananor jonno
const generateDynamicPassword = () => {
  return Math.random().toString(36).slice(-6) + 'A1@'; 
}

export async function createUser(formData: FormData) {
  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string
  const password = generateDynamicPassword() // Auto password

  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return redirect(`/super-admin/users?error=${encodeURIComponent(error.message)}`)

  if (data.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: role,
      temp_password: password,
      force_password_change: true // First time login e pass change korabe
    })
    
    // Create korar sathei mail pathano
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = user?.email || ''
    try { await sendAgentCredentialEmail(email, adminEmail, fullName, password) } catch (e) {}
  }

  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User created & email sent successfully!')
}

export async function resetUserPassword(formData: FormData) {
  const userId = formData.get('userId') as string
  const newPassword = generateDynamicPassword() // Auto pass on reset

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
  
  if (error) return redirect(`/super-admin/users?error=${encodeURIComponent('Password reset failed')}`)

  const { data: profile } = await supabaseAdmin.from('profiles').update({ 
    temp_password: newPassword,
    force_password_change: true 
  }).eq('id', userId).select().single()

  // Reset korar por user ke mail e notun pass janiye deya
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (profile) {
    try { await sendAgentCredentialEmail(profile.email, user?.email || '', profile.full_name, newPassword, true) } catch (e) {}
  }

  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Password reset dynamically and email sent!`)
}

export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as string
  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
  if (error) return redirect(`/super-admin/users?error=${encodeURIComponent('Failed to update role')}`)
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User role updated successfully!')
}

export async function deleteUser(formData: FormData) {
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (profileError) return redirect(`/super-admin/users?error=${encodeURIComponent('Cannot delete this user.')}`)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) return redirect(`/super-admin/users?error=${encodeURIComponent(authError.message)}`)
  revalidatePath('/super-admin/users')
  redirect('/super-admin/users?success=User deleted successfully!')
}

export async function createBulkUsers(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return redirect('/super-admin/users?error=No file uploaded')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = user?.email || ''
  const text = await file.text()
  const rows = text.split('\n').filter(row => row.trim() !== '')
  const supabaseAdmin = createAdminClient()
  
  let successCount = 0, existCount = 0, errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.toLowerCase().includes('email')) continue;

    const columns = row.split(',').map(c => c.trim())
    if (columns.length >= 2) {
      const email = columns[0]
      const fullName = columns[1]
      const role = columns[2] ? columns[2].toLowerCase() : 'agent' 
      const password = generateDynamicPassword() // 🆕 No password from excel

      if (email) {
        const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single()
        if (existingUser) { existCount++; continue; }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
        if (!error && data?.user) {
          await supabaseAdmin.from('profiles').upsert({
            id: data.user.id, email: email, full_name: fullName, role: role, temp_password: password, force_password_change: true
          })
          try { await sendAgentCredentialEmail(email, adminEmail, fullName, password) } catch (e) {}
          successCount++
        } else {
          errorCount++
        }
      }
    }
  }
  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Created: ${successCount} | Exists: ${existCount} | Failed: ${errorCount}`)
}

export async function sendIndividualEmailAction(formData: FormData) {
  // same as before...
  const userId = formData.get('userId') as string
  const supabaseAdmin = createAdminClient()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
  if (!profile) return redirect('/super-admin/users?error=User not found')

  try {
    await sendAgentCredentialEmail(profile.email, user?.email || '', profile.full_name, profile.temp_password)
    return redirect('/super-admin/users?success=Email sent successfully!')
  } catch (e) {
    return redirect('/super-admin/users?error=Failed to send email')
  }
}

export async function sendBulkEmailsToAllAction() {
  const supabaseAdmin = createAdminClient()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: agents } = await supabaseAdmin.from('profiles').select('*').eq('role', 'agent')
  if (!agents) return redirect('/super-admin/users?error=No agents found')

  let sent = 0
  for (const agent of agents) {
    try {
      await sendAgentCredentialEmail(agent.email, user?.email || '', agent.full_name, agent.temp_password)
      sent++
    } catch(e) {}
  }
  revalidatePath('/super-admin/users')
  redirect(`/super-admin/users?success=Sent emails to ${sent} agents!`)
}
