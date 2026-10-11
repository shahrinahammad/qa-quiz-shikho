'use client'
import { useState } from 'react'
import Link from 'next/link'
import { deleteEvaluationAttempt, sendIndividualReminder, sendBulkReminder, autoReassignQuiz } from '@/app/super-admin/dashboard/actions'

export default function TrackingTable({ reports, profileMap, userRole, userId }: { reports: any[], profileMap: any, userRole: string, userId: string }) {
  const [search, setSearch] = useState({ date: '', title: '', campaign: '', qa: '', agent: '', status: '', result: '' })

  const filteredReports = reports.filter((row: any) => {
    const dateStr = new Date(row.created_at).toLocaleDateString().toLowerCase()
    const titleStr = (row.evaluations?.title || '').toLowerCase()
    const campaignStr = (row.evaluations?.campaign || 'General').toLowerCase()
    const qaStr = (profileMap[row.evaluations?.created_by] || 'Admin').toLowerCase()
    const agentStr = (row.agent?.full_name || '').toLowerCase()
    
    const statusStr = row.status === 'ASSIGNED' ? 'pending' : 'submitted'
    let resultStr = 'pending'
    if (row.overall_score !== null) {
      resultStr = row.overall_score >= row.evaluations.passing_score ? 'pass' : 'fail'
    }

    return dateStr.includes(search.date.toLowerCase()) &&
           titleStr.includes(search.title.toLowerCase()) &&
           campaignStr.includes(search.campaign.toLowerCase()) &&
           qaStr.includes(search.qa.toLowerCase()) &&
           agentStr.includes(search.agent.toLowerCase()) &&
           (search.status === '' || statusStr === search.status) &&
           (search.result === '' || resultStr === search.result)
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">Assignment & Review Tracking</h2>
          <p className="text-xs text-gray-500 mt-1">Showing {filteredReports.length} results</p>
        </div>
        <form action={async () => { await sendBulkReminder(userRole === 'super_admin' ? undefined : userId) }}>
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            🔔 Remind All Pending
          </button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-shikho-indigo-50 text-gray-600 text-[10px] uppercase font-bold font-poppins">
            <tr>
              <th className="px-4 py-3"><input type="text" placeholder="Date..." className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, date: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="Title..." className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, title: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="Campaign..." className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, campaign: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="QA Name..." className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, qa: e.target.value})} /></th>
              <th className="px-4 py-3"><input type="text" placeholder="Agent..." className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, agent: e.target.value})} /></th>
              <th className="px-4 py-3">
                <select className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, status: e.target.value})}>
                  <option value="">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                </select>
              </th>
              <th className="px-4 py-3">
                <select className="w-full p-1.5 rounded border" onChange={e => setSearch({...search, result: e.target.value})}>
                  <option value="">All Results</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReports.map((row: any) => {
              const score = row.overall_score !== null ? Math.min(100, row.overall_score) : null
              const isPass = score !== null && score >= row.evaluations.passing_score
              const campaign = row.evaluations?.campaign || 'General'

              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-[11px] font-medium text-gray-500 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-xs font-bold text-gray-900 max-w-[150px] truncate" title={row.evaluations?.title}>{row.evaluations?.title}</td>
                  <td className="px-4 py-4 text-xs font-bold text-purple-600">{campaign}</td>
                  <td className="px-4 py-4 text-xs text-gray-700 whitespace-nowrap">{profileMap[row.evaluations?.created_by] || 'Admin'}</td>
                  <td className="px-4 py-4 text-xs text-gray-700 whitespace-nowrap">{row.agent?.full_name || 'N/A'}</td>
                  <td className="px-4 py-4 text-[10px] font-bold uppercase">{row.status === 'ASSIGNED' ? <span className="text-red-500 bg-red-50 px-2 py-1 rounded">Pending</span> : <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Submitted</span>}</td>
                  
                  <td className="px-4 py-4 text-xs font-bold">
                    {score === null ? <span className="text-gray-400">-</span> : isPass ? <span className="text-emerald-600">{score}% (Pass)</span> : <span className="text-red-500">{score}% (Fail)</span>}
                  </td>
                  
                  <td className="px-4 py-4 text-right flex justify-end gap-1.5 items-center flex-wrap">
                    {/* 🔄 Reassign Button (Only for Failed Attempts) */}
                    {score !== null && !isPass && (
                      <form action={autoReassignQuiz}>
                        <input type="hidden" name="attempt_id" value={row.attempt_id} />
                        <input type="hidden" name="agent_id" value={row.agent_id} />
                        <input type="hidden" name="qa_id" value={row.qa_id} />
                        <input type="hidden" name="campaign" value={campaign} />
                        <input type="hidden" name="eval_id" value={row.evaluation_id} />
                        <button type="submit" className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded hover:bg-purple-100 transition-colors uppercase border border-purple-100">
                          🔄 Reassign
                        </button>
                      </form>
                    )}

                    {row.status === 'ASSIGNED' && (
                      <form action={async () => { await sendIndividualReminder(row.agent_id, row.evaluations?.title) }}>
                        <button type="submit" className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded hover:bg-orange-100 transition-colors uppercase">Remind</button>
                      </form>
                    )}
                    <Link href={row.status === 'ASSIGNED' ? `/agent/evaluation/${row.attempt_id}` : row.status === 'UNDER_QA_REVIEW' ? `/qa/review/${row.attempt_id}` : `/agent/result/${row.attempt_id}`} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded hover:bg-blue-100 transition-colors uppercase">View</Link>
                    <form action={deleteEvaluationAttempt}>
                      <input type="hidden" name="attempt_id" value={row.attempt_id} />
                      <button type="submit" className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded hover:bg-red-100 transition-colors uppercase">Delete</button>
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
