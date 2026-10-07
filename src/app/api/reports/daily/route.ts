import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDailyReportEmail } from '@/lib/mail'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const dateString = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // 🛠️ FIXED: 'score' এর বদলে 'overall_score' দেওয়া হয়েছে
    const { data: attempts, error } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id, status, agent_id, overall_score')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())

    if (error) throw new Error(`Database Error: ${error.message}`)

    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
    const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Agent' }), {}) || {}

    const safeAttempts = attempts || []
    const totalAssigned = safeAttempts.length
    const totalSubmitted = safeAttempts.filter(a => a.status !== 'ASSIGNED').length 
    const pendingExams = totalAssigned - totalSubmitted

    const agentMap: any = {}
    safeAttempts.forEach(a => {
      const agentName = profileMap[a.agent_id] || 'Unknown Agent'
      if (!agentMap[agentName]) agentMap[agentName] = { name: agentName, assigned: 0, submitted: 0, totalScore: 0 }
      
      agentMap[agentName].assigned += 1
      if (a.status !== 'ASSIGNED') {
        agentMap[agentName].submitted += 1
        agentMap[agentName].totalScore += (a.overall_score || 0) // 🛠️ FIXED
      }
    })

    const agentStats = Object.values(agentMap).map((a: any) => ({
      name: a.name,
      assigned: a.assigned,
      submitted: a.submitted,
      score: a.submitted > 0 ? Math.round(a.totalScore / a.submitted) : 0
    }))

    const reportData = { date: dateString, totalAssigned, totalSubmitted, pendingExams, agentStats }

    await sendDailyReportEmail('shahrin.ahammad@shikho.com', reportData)
    return NextResponse.json({ success: true, message: 'Daily report sent!' })
    
  } catch (err: any) {
    console.error('Daily Report Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
