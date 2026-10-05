'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function sendResetLink(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = createClient()

  // Supabase থেকে ইউজারের ইমেইলে রিকভারি লিংক পাঠানো হচ্ছে
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // লিংকে ক্লিক করলে তাকে সরাসরি আমাদের আগের বানানো update-password পেজে নিয়ে যাবে
    redirectTo: 'https://qa-quiz-shikho.vercel.app/update-password',
  })

  if (error) {
    return redirect(`/forgot-password?error=${encodeURIComponent('Could not send reset link. Make sure the email is correct.')}`)
  }

  return redirect('/forgot-password?message=A password reset link has been sent to your email.')
}
