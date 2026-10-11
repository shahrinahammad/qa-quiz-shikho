'use client'
import { useState } from 'react'
import Link from 'next/link'
import { deleteEvaluationAttempt, sendIndividualReminder, sendBulkReminder, reassignQuizAction } from '@/app/super-admin/dashboard/actions'

export default function TrackingTable({ reports, profileMap, userRole, userId, allQuizzes }: { reports: any[], profileMap: any, userRole: string, userId: string, allQuizzes?: any[] }) {
  const [search, setSearch] = useState({ date: '', title: '', campaign: '', qa: '', agent: '', status: '', result: '' })
  
  // Modal States
  const [reassignModal, setReassignModal] = useState({ show: false, attempt_id: '', agent_id: '', qa_id: '', eval_id: '', campaign: '' })
  const [reassignMode, setReassignMode] = useState('auto')

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
      
      {/* 🆕 REASSIGN MODAL (POP-UP) */}
      {reassignModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">Reassign Quiz</h3>
            <p className="text-sm text-gray-500 mb-6">Choose how you want to reassign the task to the agent.</p>
            
            <form action={async (formData) => {
              await reassignQuizAction(formData);
              setReassignModal({ ...reassignModal, show: false });
            }} className="space-y-5">
              
              <input type="hidden" name="attempt_id" value={reassignModal.attempt_id} />
              <input type="hidden" name="agent_id" value={reassignModal.agent_id} />
              <input type="hidden" name="qa_id" value={reassignModal.qa_id} />
              <input type="hidden" name="campaign" value={reassignModal.campaign} />
              <input type="hidden" name="eval_id" value={reassignModal.eval_id} />

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-3 font-poppins">Reassign Mode</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <input type="radio" name="mode" value="auto" checked={reassignMode === 'auto'} onChange={() => setReassignMode('auto')} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /> 
                    <span className="font-medium text-gray-800">Auto Assign</span> <span className="text-xs text-gray-500">(Random unread quiz from same campaign)</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <input type="radio" name="mode" value="manual" checked={reassignMode === 'manual'} onChange={() => setReassignMode('manual')} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /> 
                    <span className="font-medium text-gray-800">Manual Assign</span> <span className="text-xs text-gray-500">(Select specific quiz)</span>
                  </label>
                </div>
              </div>

              {reassignMode === 'manual' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 font-poppins">Select Quiz Manually</label>
                  <select name="manual_eval_id" required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-poppins">
                    <option value="">-- Choose Quiz from Library --</option>
                    {allQuizzes?.map(q => (
                      <option key={q.id} value={q.id}>{q.title} ({q.campaign || 'No Campaign'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setReassignModal({...reassignModal, show: false})} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors font-poppins">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors shadow-md font-poppins">Confirm Reassign</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* ------------------ Standard Table Content Below ------------------ */}

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
                    
                    {/* 🔄 Reassign Button (Opens Modal) */}
                    {score !== null && !isPass && (
                      <button 
                        type="button" 
                        onClick={() => setReassignModal({ show: true, attempt_id: row.attempt_id, agent_id: row.agent_id, qa_id: row.qa_id, eval_id: row.evaluation_id, campaign })}
                        className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded hover:bg-purple-100 transition-colors uppercase border border-purple-100"
                      >
                        🔄 Reassign
                      </button>
                    )}

                    {/* 🔔 Remind Button */}
                    {row.status === 'ASSIGNED' && (
                      <form action={async () => { await sendIndividualReminder(row.agent_id, row.evaluations?.title) }}>
                        <button type="submit" className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded hover:bg-orange-100 transition-colors uppercase">Remind</button>
                      </form>
                    )}
                    
                    {/* 👁️ View Button Fix (No 404 for Pending) */}
                    {row.status === 'ASSIGNED' ? (
                      <button onClick={() => alert('Agent has not submitted the exam yet. You can view the result after submission.')} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded uppercase border border-gray-200 cursor-not-allowed">View</button>
                    ) : (
                      <Link href={row.status === 'UNDER_QA_REVIEW' ? `/qa/review/${row.attempt_id}` : `/agent/result/${row.attempt_id}`} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded hover:bg-blue-100 transition-colors uppercase border border-blue-100">View</Link>
                    )}

                    {/* 🗑️ Delete Button */}
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
