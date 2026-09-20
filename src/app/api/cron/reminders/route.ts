import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/app/actions/notification'

export async function GET(request: Request) {
  const supabaseAdmin = createAdminClient()

  // Find all pending exams
  const { data: pendingExams } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('agent_id, evaluations!inner(title)')
    .eq('status', 'ASSIGNED')

  if (!pendingExams || pendingExams.length === 0) {
    return NextResponse.json({ success: true, message: 'No pending exams found.' })
  }

  // Send push notification to all pending agents
  let sentCount = 0
  
  // 🛠️ FIXED: Added 'as any[]' to bypass strict TS checking
  for (const exam of pendingExams as any[]) {
    try {
      await sendPushNotification(
        exam.agent_id,
        '⏳ Exam Reminder!',
        `Your exam "${exam.evaluations?.title}" is still pending. Please submit it ASAP.`
      )
      sentCount++
    } catch (error) {
      console.error('Failed to remind agent:', exam.agent_id)
    }
  }

  return NextResponse.json({ success: true, notifiedCount: sentCount })
}
