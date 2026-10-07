import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklyReportEmail } from '@/lib/mail'

export async function GET() {
  const supabaseAdmin = createAdminClient()
  
  const today = new Date()
  const lastWeek = new Date()
  lastWeek.setDate(today.getDate() - 7)
  
  const weekRange = `${lastWeek.toLocaleDateString('en-GB')} to ${today.toLocaleDateString('en-GB')}`

  const { data: attempts } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id, status, score')
    .gte('created_at', lastWeek.toISOString())
    .lte('created_at', today.toISOString())

  const totalAssigned = attempts?.length || 0
  const totalSubmitted = attempts?.filter(a => a.status === 'SUBMITTED' || a.status === 'REVIEWED').length || 0
  const pendingExams = totalAssigned - totalSubmitted

  const reportData = { weekRange, totalAssigned, totalSubmitted, pendingExams, topPerformers: [] }

  // 🔴 এখানে আপাতত আপনার ইমেইলটি দিন
  const adminEmail = 'shahrin.ahammad@shikho.com' 
  
  try {
    await sendWeeklyReportEmail(adminEmail, reportData)
    return NextResponse.json({ success: true, message: 'Weekly report sent!' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
