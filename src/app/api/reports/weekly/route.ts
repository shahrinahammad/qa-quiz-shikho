import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklyReportEmail } from '@/lib/mail'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    
    // ১. নিখুঁতভাবে গত ৭ দিনের সময় বের করা
    const now = new Date()
    const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0)
    
    const weekRange = `${lastWeek.toLocaleDateString('en-GB')} to ${now.toLocaleDateString('en-GB')}`

    const { data: attempts, error } = await supabaseAdmin
      .from('evaluation_attempts')
      .select('id, status, score')
      .gte('created_at', lastWeek.toISOString())
      .lte('created_at', now.toISOString())

    if (error) throw new Error(`Database Error: ${error.message}`)

    const safeAttempts = attempts || []
    const totalAssigned = safeAttempts.length
    
    // 🛠️ FIXED: 'ASSIGNED' ছাড়া বাকি সবকিছুকেই সাবমিটেড ধরা হবে, তাই আর '0' দেখাবে না
    const totalSubmitted = safeAttempts.filter(a => a.status !== 'ASSIGNED').length
    const pendingExams = totalAssigned - totalSubmitted

    const reportData = { weekRange, totalAssigned, totalSubmitted, pendingExams, topPerformers: [] }

    await sendWeeklyReportEmail('shahrin.ahammad@shikho.com', reportData)
    return NextResponse.json({ success: true, message: 'Weekly report sent!' })
    
  } catch (err: any) {
    console.error('Weekly Report Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
