'use client'
import { useState } from 'react'
import Link from 'next/link'
import { deleteEvaluationAttempt, sendIndividualReminder, sendBulkReminder } from '@/app/super-admin/dashboard/actions'

export default function TrackingTable({ reports, profileMap, userRole, userId }: { reports: any[], profileMap: any, userRole: string, userId: string }) {
  const [search, setSearch] = useState({ date: '', title: '', qa: '', agent: '', result: '' })

  const filteredReports = reports.filter((row: any) => {
    const dateStr = new Date(row.created_at).toLocaleDateString().toLowerCase()
    const titleStr = (row.evaluations?.title || '').toLowerCase()
    const qaStr = (profileMap[row.evaluations?.created_by] || 'Admin').toLowerCase()
    const agentStr = (row.agent?.full_name || '').toLowerCase()
    
    let resultStr = 'pending'
    if (row.overall_score !== null) {
      resultStr = row.overall_score >= row.evaluations.passing_score ? 'pass' : 'fail'
    }

    return dateStr.includes(search.date.toLowerCase()) &&
           titleStr.includes(search.title.toLowerCase()) &&
           qaStr.includes(search.qa.toLowerCase()) &&
           agentStr.includes(search.agent.toLowerCase()) &&
           resultStr.includes(search.result.toLowerCase())
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900 font-poppins">Assignment & Review Tracking</h2>
        <form action={async () => { await sendBulkReminder(userRole === 'super_admin' ? undefined : userId) }}>
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            🔔 Remind All Pending
          </button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase font-poppins">
            <tr>
              <th className="px-4 py-3"><input type="text" placeholder="🔍 Date..." className="w-full text-xs p-1 rounded border" onChange={e => setSearch({...search, date: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="🔍 Title..." className="w-full text-xs p-1 rounded border" onChange={e => setSearch({...search, title: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="🔍 QA Name..." className="w-full text-xs p-1 rounded border" onChange={e => setSearch({...search, qa: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="🔍 Agent..." className="w-full text-xs p-1 rounded border" onChange={e => setSearch({...search, agent: e.target.value})} /></th>
              <th className="px-4 py-3">Agent Task</th>
              <th className="px-4 py-3"><input type="text" placeholder="🔍 Pass/Fail..." className="w-full text-xs p-1 rounded border" onChange={e => setSearch({...search, result: e.target.value})} /></th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReports.map((row: any) => {
              const score = row.overall_score !== null ? Math.min(100, row.overall_score) : null
              const isPass = score !== null && score >= row.evaluations.passing_score

              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-xs font-medium text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900">{row.evaluations?.title}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{profileMap[row.evaluations?.created_by] || 'Admin'}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.agent?.full_name || 'N/A'}</td>
                  <td className="px-4 py-4 text-xs font-bold">{row.status === 'ASSIGNED' ? <span className="text-red-500">❌ Pending</span> : <span className="text-emerald-600">✅ Submitted</span>}</td>
                  
                  <td className="px-4 py-4 text-xs font-bold">
                    {score === null ? <span className="text-gray-400">-</span> : isPass ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✅ Pass</span> : <span className="bg-red-100 text-red-700 px-2 py-1 rounded">❌ Fail</span>}
                  </td>
                  
                  <td className={`px-4 py-4 text-sm font-bold ${isPass ? 'text-emerald-600' : 'text-red-500'}`}>{score !== null ? `${score}%` : '-'}</td>
                  
                  <td className="px-4 py-4 text-right flex justify-end gap-2 items-center">
                    {row.status === 'ASSIGNED' && (
                      <form action={async () => { await sendIndividualReminder(row.agent_id, row.evaluations?.title) }}>
                        <button type="submit" className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded hover:bg-orange-100 transition-colors uppercase">🔔 Remind</button>
                      </form>
                    )}
                    <Link href={row.status === 'ASSIGNED' ? `/agent/evaluation/${row.attempt_id}` : row.status === 'UNDER_QA_REVIEW' ? `/qa/review/${row.attempt_id}` : `/agent/result/${row.attempt_id}`} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors uppercase">View</Link>
                    <form action={deleteEvaluationAttempt}>
                      <input type="hidden" name="attempt_id" value={row.attempt_id} />
                      <button type="submit" className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors uppercase">Delete</button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
