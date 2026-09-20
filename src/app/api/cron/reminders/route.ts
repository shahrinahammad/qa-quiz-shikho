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

  let sentCount = 0
  
  for (const item of pendingExams) {
    const exam: any = item // 🛠️ Bulletproof TypeScript bypass
    
    // Supabase array ba object ja-i return koruk, amra title ber kore nibo
    const examTitle = Array.isArray(exam.evaluations) 
      ? exam.evaluations[0]?.title 
      : exam.evaluations?.title

    if (examTitle) {
      try {
        await sendPushNotification(
          exam.agent_id,
          '⏳ Exam Reminder!',
          `Your exam "${examTitle}" is still pending. Please submit it ASAP.`
        )
        sentCount++
      } catch (error) {
        console.error('Failed to remind agent:', exam.agent_id)
      }
    }
  }

  return NextResponse.json({ success: true, notifiedCount: sentCount })
}
