import { createClient } from '@/lib/supabase/server'
import { createQuestion } from './actions'

export default async function QuestionBankPage({
  searchParams
}: {
  searchParams: { error?: string, success?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-shikho-canvas p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-shikho-indigo-600 font-poppins">Question Bank</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">Manage and create questions for evaluations.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 font-poppins">Add New Question</h2>
            
            {searchParams.success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                {searchParams.success}
              </div>
            )}
            
            {searchParams.error && (
              <div className="mb-4 p-3 bg-red-50 text-shikho-coral-500 text-sm rounded-lg border border-red-200">
                {searchParams.error}
              </div>
            )}

            <form action={createQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Type</label>
                  <select name="type" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm bg-white">
                    <option value="MCQ">MCQ</option>
                    <option value="SCENARIO">Scenario</option>
                    <option value="WRITTEN">Written</option>
                    <option value="VOICE">Voice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Marks</label>
                  <input type="number" name="marks" required min="1" defaultValue="5" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Competency</label>
                  <select name="competency" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm bg-white">
                    <option value="Product Knowledge">Product Knowledge</option>
                    <option value="CRM">CRM</option>
                    <option value="Communication">Communication</option>
                    <option value="Rebuttal">Rebuttal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Difficulty</label>
                  <select name="difficulty" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm bg-white">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Question Content</label>
                <textarea name="content" required rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-bengali" placeholder="Write your question here... (বাংলা বা English)"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Expected Answer (Optional)</label>
                <textarea name="expected_answer" rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-bengali" placeholder="Key points QA should look for..."></textarea>
              </div>

              <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-2.5 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors mt-4">
                Save Question
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">Question Library</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-poppins">
                Total: {questions?.length || 0}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-shikho-indigo-50 text-gray-600 text-xs uppercase tracking-wider font-poppins">
                    <th className="px-6 py-4 font-medium">ID / Type</th>
                    <th className="px-6 py-4 font-medium">Question</th>
                    <th className="px-6 py-4 font-medium">Competency</th>
                    <th className="px-6 py-4 font-medium">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {questions?.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">No questions added yet.</td></tr>
                  ) : (
                    questions?.map((q) => (
                      <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{q.question_id}</div>
                          <div className="text-xs text-shikho-magenta-500 mt-1 font-semibold">{q.type}</div>
                        </td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-700 font-bengali line-clamp-2">{q.content}</p></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{q.competency}<div className="text-xs text-gray-400 mt-1">{q.difficulty}</div></td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{q.marks}</td>
                        <td className="px-6 py-4 text-right">
                          <form action={deleteQuestion}>
                            <input type="hidden" name="id" value={q.id} />
                            <button type="submit" className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg" onClick={(e) => {if(!confirm('Delete this question?')) e.preventDefault()}}>Delete</button>
                          </form>
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
