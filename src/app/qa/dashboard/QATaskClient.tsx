'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function QATaskClient({ tasks, userId }: { tasks: any[], userId: string }) {
  const [searchAgent, setSearchAgent] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')

  const filteredTasks = tasks.filter(t => {
    const matchAgent = t.agent_name.toLowerCase().includes(searchAgent.toLowerCase())
    const matchStatus = filterStatus ? t.status === filterStatus : true
    const matchCampaign = filterCampaign ? t.campaign.toLowerCase().includes(filterCampaign.toLowerCase()) : true
    return matchAgent && matchStatus && matchCampaign
  })

  const campaigns = Array.from(new Set(tasks.map(t => t.campaign)))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">All Assigned Tasks & Reviews</h2>
          <p className="text-xs text-gray-500 mt-1">Priority: Your assigned exams are highlighted at the top.</p>
        </div>
        
        {/* 🔍 Dynamic Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <input type="text" placeholder="Search Agent..." className="px-3 py-1.5 text-xs border rounded-lg w-full md:w-auto font-poppins" onChange={e => setSearchAgent(e.target.value)} />
          <select className="px-3 py-1.5 text-xs border rounded-lg bg-white font-poppins" onChange={e => setFilterCampaign(e.target.value)}>
            <option value="">All Campaigns</option>
            {campaigns.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="px-3 py-1.5 text-xs border rounded-lg bg-white font-poppins" onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ASSIGNED">⏳ Pending Submission</option>
            <option value="UNDER_QA_REVIEW">🔍 Ready to Review</option>
            <option value="PUBLISHED">✅ Done</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-shikho-indigo-50 text-gray-600 text-[10px] uppercase font-bold font-poppins">
            <tr>
              <th className="p-4">Date & Title</th>
              <th className="p-4">Campaign</th>
              <th className="p-4">Agent Name</th>
              <th className="p-4">Assigned By</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTasks.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm font-poppins">No tasks found.</td></tr>
            ) : (
              filteredTasks.map((t: any) => (
                <tr key={t.attempt_id} className={`hover:bg-gray-50 ${t.isMyPriority ? 'bg-purple-50/10' : ''}`}>
                  <td className="p-4">
                    <div className="text-[10px] text-gray-400 font-poppins">{new Date(t.created_at).toLocaleDateString()}</div>
                    <div className="text-xs font-bold text-gray-900 mt-0.5 max-w-[150px] truncate" title={t.title}>{t.title}</div>
                  </td>
                  <td className="p-4 text-xs font-bold text-purple-600 font-poppins">{t.campaign}</td>
                  <td className="p-4 text-xs font-medium text-gray-800 font-poppins">{t.agent_name}</td>
                  <td className="p-4 text-xs font-medium text-gray-500 font-poppins">
                    {t.isMyPriority ? <span className="text-shikho-magenta-600 font-bold bg-shikho-magenta-50 px-2 py-1 rounded">You (Priority)</span> : t.assigner_name}
                  </td>
                  <td className="p-4 font-poppins">
                    {t.status === 'ASSIGNED' && <span className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 font-bold uppercase">⏳ Pending Agent</span>}
                    {t.status === 'UNDER_QA_REVIEW' && <span className="text-[10px] px-2 py-1 rounded bg-orange-100 text-orange-700 font-bold uppercase">🔍 Needs Review</span>}
                    {t.status === 'PUBLISHED' && <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 font-bold uppercase">✅ Done</span>}
                    {t.status === 'RECHECK_REQUESTED' && <span className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 font-bold uppercase">⚠️ Dispute</span>}
                  </td>
                  <td className="p-4 text-right font-poppins">
                    {t.status === 'ASSIGNED' && <span className="text-[10px] text-gray-400 font-bold italic">Not Submitted</span>}
                    
                    {(t.status === 'UNDER_QA_REVIEW' || t.status === 'RECHECK_REQUESTED') && (
                      <Link href={`/qa/review/${t.attempt_id}`} className="text-[10px] font-bold text-white bg-shikho-magenta-500 px-3 py-1.5 rounded hover:bg-shikho-magenta-600 transition-colors shadow-sm uppercase">
                        Start Reviewing
                      </Link>
                    )}

                    {t.status === 'PUBLISHED' && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-black text-emerald-600">{t.overall_score}%</span>
                        <Link href={`/agent/result/${t.attempt_id}`} className="text-[10px] font-bold text-blue-600 hover:underline">View Score</Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
