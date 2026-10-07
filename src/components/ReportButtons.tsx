'use client'
import { useState } from 'react'

export default function ReportButtons() {
  const [loading, setLoading] = useState(false)

  const sendReport = async (type: 'daily' | 'weekly') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${type}`)
      if (res.ok) alert(`${type.toUpperCase()} Report Sent Successfully to your email!`)
      else alert(`Failed to send ${type} report.`)
    } catch (e) {
      alert('Error occurred!')
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-4 mb-6">
      <button 
        onClick={() => sendReport('daily')} 
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition"
      >
        📊 Force Send Daily Report
      </button>
      
      <button 
        onClick={() => sendReport('weekly')} 
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition"
      >
        📈 Force Send Weekly Report
      </button>
    </div>
  )
}
