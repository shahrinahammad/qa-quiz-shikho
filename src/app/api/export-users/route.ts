import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = createAdminClient()
  
  // শুধুমাত্র এজেন্টদের ডাটা আনা হচ্ছে
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('role', 'agent').order('created_at', { ascending: false })

  let csv = 'Full Name,Email,Role,Password\n'
  data?.forEach(u => {
    csv += `${u.full_name},${u.email},${u.role},${u.temp_password || 'Not Available'}\n`
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="shikho_agent_credentials.csv"'
    }
  })
}
