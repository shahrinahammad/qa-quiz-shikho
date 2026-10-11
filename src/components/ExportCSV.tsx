'use client'

export default function ExportCSV({ data, filename }: { data: any[], filename: string }) {
  const handleDownload = () => {
    if (data.length === 0) return alert('No data to export')
    
    // CSV Headers
    const headers = ['Date', 'Exam Title', 'Campaign', 'Assigned By', 'Agent Name', 'Status', 'Target Score', 'Obtained Score', 'Final Result']
    const csvRows = [headers.join(',')]

    data.forEach(row => {
      const date = new Date(row.created_at).toLocaleDateString('en-GB')
      const title = `"${row.evaluations?.title || ''}"`
      const campaign = `"${row.evaluations?.campaign || 'General'}"` // DB আপডেটের পর ডায়নামিক হবে
      const qa = `"${row.qaName || 'Admin'}"`
      const agent = `"${row.agent?.full_name || 'N/A'}"`
      const status = row.status
      const passScore = row.evaluations?.passing_score || 0
      const obtScore = row.overall_score !== null ? row.overall_score : 'N/A'
      
      let result = 'Pending'
      if (row.overall_score !== null) {
        result = row.overall_score >= passScore ? 'Pass' : 'Fail'
      }

      csvRows.push([date, title, campaign, qa, agent, status, passScore, obtScore, result].join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm text-sm font-poppins">
      📥 Download Raw Data (CSV)
    </button>
  )
}
