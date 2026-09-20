'use server'

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// VAPID কনফিগারেশন
webpush.setVapidDetails(
  'mailto:admin@shikho.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// ইউজারের পারমিশন ডাটাবেসে সেভ করা
export async function saveSubscription(userId: string, subscription: any) {
  const supabaseAdmin = createAdminClient()
  await supabaseAdmin.from('profiles').update({ push_subscription: subscription }).eq('id', userId)
}

// নোটিফিকেশন পুশ করা
export async function sendPushNotification(userId: string, title: string, body: string) {
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin.from('profiles').select('push_subscription').eq('id', userId).single()

  if (profile?.push_subscription) {
    try {
      await webpush.sendNotification(
        profile.push_subscription,
        JSON.stringify({ title, body })
      )
    } catch (error) {
      console.error('Push Notification Error:', error)
    }
  }
}
