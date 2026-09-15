'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitQAReview } from './actions'

export default function ReviewClient({ attempt, questions, answers }: { attempt: any, questions: any[], answers: any[] }) {
  const router = useRouter()
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // শুধু যেসব প্রশ্নের উত্তর দিয়েছে সেগুলো ফিল্টার করা
  const answeredQuestions = questions.filter(q => answers.find(a => a.question_id === q.id))
  const currentQuestion = answeredQuestions[currentQuestionIdx]
  
  if (answeredQuestions.length === 0) return <div className="text-center p-10">No answers found for this evaluation.</div>

  const currentAnswer = answers.find(a => a.question_id === currentQuestion.id)

  const handleNext = () => { if (currentQuestionIdx < answeredQuestions.length - 1) setCurrentQuestionIdx(idx => idx + 1) }
  const handlePrev = () => { if (currentQuestionIdx > 0) setCurrentQuestionIdx(idx => idx - 1) }

  const totalMaxMarks = answeredQuestions.reduce((sum, q) => sum + q.marks, 0)
  const currentObtained = Object.values(scores).reduce((sum, mark) => sum + (mark || 0), 0)

  const handleSubmit = async () => {
    if (Object.keys(scores).length < answeredQuestions.length) {
      alert("Please score all questions before submitting.")
      return
    }
    if (!window.confirm("Are you sure you want to finalize and publish this evaluation?")) return

    setIsSubmitting(true)
    try {
      await submitQAReview(attempt.attempt_id, scores, feedback, currentObtained, totalMaxMarks)
      router.push('/qa/dashboard')
    } catch (error) {
      alert("Failed to submit review.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center border">
        <div>
          <h1 className="text-xl font-bold font-poppins text-shikho-magenta-500">Evaluating: {attempt.profiles?.full_name || 'Agent'}</h1>
          <p className="text-sm text-gray-500 font-poppins">{attempt.evaluations.title}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total Score So Far</p>
          <p className="text-2xl font-bold text-shikho-indigo-600">{currentObtained} <span className="text-sm text-gray-400">/ {totalMaxMarks}</span></p>
        </div>
      </div>

      {/* Question & Answer Panel */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <span className="text-xs font-bold uppercase text-gray-500">Question {currentQuestionIdx + 1} of {answeredQuestions.length}</span>
          <span className="text-sm font-bold text-shikho-indigo-600 bg-shikho-indigo-50 px-3 py-1 rounded-md">Total Marks: {currentQuestion.marks}</span>
        </div>
        
        <h2 className="text-lg text-gray-900 font-bengali leading-relaxed mb-6 font-medium">{currentQuestion.content}</h2>
        
        {currentQuestion.expected_answer && (
          <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-xs font-bold text-green-700 mb-1 uppercase">Expected Answer Key</p>
            <p className="text-sm text-green-800 font-bengali">{currentQuestion.expected_answer}</p>
          </div>
        )}

        {/* Agent's Answer Section */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-8 relative">
          <div className="absolute -top-3 left-4 bg-gray-200 px-3 py-1 rounded-full text-xs font-bold text-gray-600">Agent's Submission</div>
          
          {currentAnswer?.audio_url && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Recorded Audio:</p>
              <audio src={currentAnswer.audio_url} controls className="w-full max-w-md h-12 rounded-lg" />
            </div>
          )}

          {currentAnswer?.text_answer && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Text Output:</p>
              <p className="text-base text-gray-800 font-bengali whitespace-pre-wrap">{currentAnswer.text_answer}</p>
            </div>
          )}

          {!currentAnswer?.audio_url && !currentAnswer?.text_answer && (
            <p className="text-sm text-gray-400 italic">No answer provided.</p>
          )}
        </div>

        {/* Scoring Input */}
        <div className="mt-8 flex items-center gap-4">
          <label className="text-sm font-bold text-gray-700 font-poppins">Score for this question:</label>
          <input 
            type="number" 
            min="0" 
            max={currentQuestion.marks} 
            value={scores[currentQuestion.id] || ''}
            onChange={(e) => setScores({...scores, [currentQuestion.id]: Number(e.target.value)})}
            className="w-24 px-4 py-2 text-lg font-bold rounded-lg border-2 border-gray-300 focus:border-shikho-magenta-500 focus:ring-0 text-center"
            placeholder="0"
          />
        </div>
      </div>

      {/* Final Feedback (Only on last question) */}
      {currentQuestionIdx === answeredQuestions.length - 1 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-shikho-magenta-200">
          <label className="block text-sm font-bold text-gray-700 mb-2 font-poppins">Overall QA Feedback</label>
          <textarea 
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-shikho-magenta-500 font-poppins text-sm"
            placeholder="Write constructive feedback for the agent..."
          ></textarea>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
        <button onClick={handlePrev} disabled={currentQuestionIdx === 0 || isSubmitting} className="px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50">Previous</button>
        {currentQuestionIdx === answeredQuestions.length - 1 ? (
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2.5 bg-shikho-magenta-500 text-white rounded-lg hover:bg-shikho-magenta-600 disabled:opacity-50 font-bold shadow-ambient">
            {isSubmitting ? 'Publishing...' : 'Publish Result'}
          </button>
        ) : (
          <button onClick={handleNext} disabled={isSubmitting} className="px-8 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">Next Question</button>
        )}
      </div>
    </div>
  )
}
