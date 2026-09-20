'use client'

import { useEffect } from 'react'
import { saveSubscription } from '@/app/actions/notification'

// Base64 কনভার্টার
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationManager({ userId }: { userId: string }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
            }).then(subscription => {
              saveSubscription(userId, JSON.parse(JSON.stringify(subscription)))
            }).catch(err => console.error("Subscription failed:", err))
          }
        })
      })
    }
  }, [userId])

  return null // এটি ব্যাকগ্রাউন্ডে কাজ করবে, তাই স্ক্রিনে কিছু দেখানোর দরকার নেই
}
