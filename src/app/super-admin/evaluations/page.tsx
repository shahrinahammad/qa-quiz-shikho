import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createEvaluation } from './actions'
import { redirect } from 'next/navigation'

export default async function EvaluationsPage({
  searchParams
}: {
  searchParams: { error?: string, success?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()
  
  // অ্যাডমিন চাবি দিয়ে এজেন্টদের লিস্ট আনা
  const { data: agents } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'agent')

  // অ্যাডমিন চাবি দিয়ে কোয়েশ্চেন ব্যাংক থেকে সব প্রশ্ন আনা
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

  // তৈরি করা ইভালুয়েশনগুলো আনা
  const { data: evaluations } = await supabaseAdmin
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Evaluation Builder</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">Create exams, select questions, and assign them to agents.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Evaluation Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Assign New Evaluation</h2>
            
            {searchParams.success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 break-words">
                {searchParams.success}
              </div>
            )}
            
            {searchParams.error && (
              <div className="mb-4 p-3 bg-red-50 text-shikho-coral-500 text-sm rounded-lg border border-red-200 break-words">
                {searchParams.error}
              </div>
            )}

            <form action={createEvaluation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Evaluation Title</label>
                <input type="text" name="title" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins" placeholder="e.g. CRM Final Test Q3" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Description / Instructions</label>
                <textarea name="description" rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins" placeholder="Special instructions for the agent..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Duration (Mins)</label>
                  <input type="number" name="duration_minutes" required defaultValue="30" min="1" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Pass Score (%)</label>
                  <input type="number" name="passing_score" required defaultValue="80" min="1" max="100" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Assign to Agent</label>
                <select name="agent_id" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm bg-white font-poppins">
                  <option value="">Select an Agent...</option>
                  {agents?.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* প্রশ্ন সিলেক্ট করার অপশন (Question Selection) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">Select Questions</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
                  {questions?.length === 0 ? (
                    <p className="text-xs text-gray-500 p-2 font-poppins">No questions available. Add questions to the bank first.</p>
                  ) : (
                    questions?.map(q => (
                      <label key={q.id} className="flex items-start gap-3 p-2 bg-white rounded cursor-pointer border border-transparent hover:border-shikho-indigo-300 transition-colors shadow-sm">
                        {/* 🛠️ FIXED: name="question_ids" theke name="questions" kora hoyeche */}
                        <input type="checkbox" name="questions" value={q.id} className="mt-1 accent-shikho-indigo-600" />
                        <div>
                          <p className="text-xs font-bold text-gray-800 font-poppins">
                            {q.question_id} <span className="text-gray-400 font-normal">({q.marks} Marks)</span>
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-1 font-bengali mt-0.5">{q.content}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors mt-4">
                Create & Assign
              </button>
            </form>
          </div>

          {/* Evaluations List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">Active Evaluations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                    <th className="px-6 py-4 font-medium">Evaluation ID</th>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Questions</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {evaluations?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm font-poppins">
                        No evaluations created yet.
                      </td>
                    </tr>
                  ) : (
                    evaluations?.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 font-poppins">{ev.evaluation_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-poppins font-medium">{ev.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-poppins">
                          {ev.question_ids?.length || 0} Qs
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-poppins">{ev.duration_minutes} mins</td>
                        <td className="px-6 py-4">
                           <span className="px-3 py-1 rounded-full text-xs font-medium font-poppins bg-shikho-sunrise-500/10 text-shikho-sunrise-500">
                             {ev.status}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
