import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDailyReportEmail } from '@/lib/mail'

export async function GET() {
  const supabaseAdmin = createAdminClient()
  
  const today = new Date()
  const dateString = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
  const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString()

  // আজকের সব কুইজ ফেচ করা
  const { data: attempts, error } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id, status, agent_id, score, profiles!evaluation_attempts_agent_id_fkey(full_name)')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (error || !attempts) return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })

  const totalAssigned = attempts.length
  const totalSubmitted = attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'REVIEWED').length
  const pendingExams = totalAssigned - totalSubmitted

  // এজেন্টদের ডাটা গ্রুপিং
  const agentMap: any = {}
  attempts.forEach(a => {
    // @ts-ignore
    const agentName = a.profiles?.full_name || 'Unknown Agent'
    if (!agentMap[agentName]) agentMap[agentName] = { name: agentName, assigned: 0, submitted: 0, totalScore: 0 }
    
    agentMap[agentName].assigned += 1
    if (a.status === 'SUBMITTED' || a.status === 'REVIEWED') {
      agentMap[agentName].submitted += 1
      agentMap[agentName].totalScore += (a.score || 0)
    }
  })

  const agentStats = Object.values(agentMap).map((a: any) => ({
    name: a.name,
    assigned: a.assigned,
    submitted: a.submitted,
    score: a.submitted > 0 ? Math.round(a.totalScore / a.submitted) : 0
  }))

  const reportData = { date: dateString, totalAssigned, totalSubmitted, pendingExams, agentStats }

  // 🔴 এখানে আপাতত আপনার ইমেইলটি দিন (টেস্ট কনফার্ম হলে পরে গ্রুপের ইমেইল দিয়ে দেব)
  const adminEmail = 'shahrin.ahammad@shikho.com' 
  
  try {
    await sendDailyReportEmail(adminEmail, reportData)
    return NextResponse.json({ success: true, message: 'Daily report sent!' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
