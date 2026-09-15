'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function requestRecheck(formData: FormData) {
  const attempt_id = formData.get('attempt_id') as string
  const supabaseAdmin = createAdminClient()

  // স্ট্যাটাস পরিবর্তন করে রিচেক রিকোয়েস্ট পাঠানো হলো
  await supabaseAdmin
    .from('evaluation_attempts')
    .update({ status: 'RECHECK_REQUESTED' })
    .eq('attempt_id', attempt_id)

  revalidatePath('/agent/dashboard')
  revalidatePath('/qa/dashboard')
  redirect('/agent/dashboard')
}
