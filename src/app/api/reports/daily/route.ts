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

    const { data: attempts, error } = await supabaseAdmin
      .from('evaluation_attempts')
      .select(`id, status, agent_id, overall_score, created_at, evaluations!inner(title, created_by)`)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())

    if (error) throw new Error(error.message)

    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name')
    const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.full_name || 'Admin' }), {}) || {}

    const safeAttempts = attempts || []
    
    // Data Processing for Email
    const summary = { assigned: safeAttempts.length, submitted: 0, pending: 0, reviewed: 0, recheck: 0 }
    const qaMap: any = {}; const agentMap: any = {}; const details: any[] = []

    safeAttempts.forEach((a: any) => {
      const qaName = profileMap[a.evaluations?.created_by] || 'Admin'
      const agentName = profileMap[a.agent_id] || 'Agent'

      if (a.status !== 'ASSIGNED') summary.submitted++
      else summary.pending++
      if (a.status === 'PUBLISHED') summary.reviewed++
      if (a.status === 'RECHECK_REQUESTED') summary.recheck++

      if (!qaMap[qaName]) qaMap[qaName] = { qaName, assigned: 0, reviewed: 0, recheck: 0 }
      qaMap[qaName].assigned++
      if (a.status === 'PUBLISHED') qaMap[qaName].reviewed++
      if (a.status === 'RECHECK_REQUESTED') qaMap[qaName].recheck++

      if (!agentMap[agentName]) agentMap[agentName] = { agentName, assigned: 0, submitted: 0 }
      agentMap[agentName].assigned++
      if (a.status !== 'ASSIGNED') agentMap[agentName].submitted++

      details.push({
        date: new Date(a.created_at).toLocaleDateString('en-GB'),
        examTitle: a.evaluations?.title,
        qaName, agentName,
        status: a.status === 'ASSIGNED' ? 'Pending' : a.status === 'PUBLISHED' ? 'Reviewed' : 'Submitted',
        score: a.overall_score !== null ? `${a.overall_score}%` : '-'
      })
    })

    const reportData = {
      dateRange: dateString, summary, qaStats: Object.values(qaMap), details,
      agentStats: Object.values(agentMap).map((ag: any) => ({ ...ag, status: ag.submitted > 0 ? 'Attended' : 'Not Attended' }))
    }

    await sendDailyReportEmail('shahrin.ahammad@shikho.com', reportData)
    return NextResponse.json({ success: true, message: 'Daily report sent!' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
