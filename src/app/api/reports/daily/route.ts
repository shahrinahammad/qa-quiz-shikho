import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDailyReportEmail } from '@/lib/mail'

export async function GET() {
  const supabaseAdmin = createAdminClient()
  
  const today = new Date()
  const dateString = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
  const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString()

  // ১. কোনো জয়েনিং ছাড়া সেফলি অ্যাটেম্পট ফেচ করা
  const { data: attempts, error } = await supabaseAdmin
    .from('evaluation_attempts')
    .select('id, status, agent_id, score')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ২. এজেন্টদের নাম ড্যাশবোর্ডের মতো আলাদাভাবে ফেচ করা (যাতে কোনোভাবেই এরর না আসে)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Agent' }), {}) || {}

  const safeAttempts = attempts || []
  const totalAssigned = safeAttempts.length
  const totalSubmitted = safeAttempts.filter(a => a.status !== 'ASSIGNED').length
  const pendingExams = totalAssigned - totalSubmitted

  // ৩. এজেন্টদের ডেটা গ্রুপিং
  const agentMap: any = {}
  safeAttempts.forEach(a => {
    const agentName = profileMap[a.agent_id] || 'Unknown Agent'
    if (!agentMap[agentName]) agentMap[agentName] = { name: agentName, assigned: 0, submitted: 0, totalScore: 0 }
    
    agentMap[agentName].assigned += 1
    if (a.status !== 'ASSIGNED') {
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

  const adminEmail = 'shahrin.ahammad@shikho.com' 
  
  try {
    await sendDailyReportEmail(adminEmail, reportData)
    return NextResponse.json({ success: true, message: 'Daily report sent!' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
