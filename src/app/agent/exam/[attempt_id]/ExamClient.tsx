'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitEvaluation } from './actions'

export default function ExamClient({ attempt, questions }: { attempt: any, questions: any[] }) {
  const router = useRouter()
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(attempt.evaluations.duration_minutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Timer Logic
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit() // Time up হলে অটো সাবমিট
      return
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timerId)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIdx]
  const progress = Math.round(((currentQuestionIdx + 1) / questions.length) * 100)

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) setCurrentQuestionIdx(idx => idx + 1)
  }

  const handlePrev = () => {
    if (currentQuestionIdx > 0) setCurrentQuestionIdx(idx => idx - 1)
  }

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).filter(k => answers[k].trim() !== '').length;
    const confirmSubmit = window.confirm(`You have answered ${answeredCount} out of ${questions.length} questions.\n\nAre you sure you want to submit?`);
    
    if (!confirmSubmit) return;

    setIsSubmitting(true)
    try {
      await submitEvaluation(attempt.attempt_id, answers)
      router.push('/agent/dashboard')
    } catch (error) {
      alert("Something went wrong while submitting.")
      setIsSubmitting(false)
    }
  }

  if (!currentQuestion) return <div className="text-center p-10">Loading questions...</div>

  return (
    <div className="space-y-6">
      
      {/* Top Bar: Timer & Progress */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-poppins">{attempt.evaluations.title}</h1>
          <p className="text-sm text-gray-500 font-poppins">Question {currentQuestionIdx + 1} of {questions.length}</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="w-48 bg-gray-100 h-2.5 rounded-full overflow-hidden hidden sm:block">
            <div className="bg-shikho-magenta-500 h-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold font-poppins text-lg tabular-nums shadow-inner ${timeLeft < 300 ? 'bg-red-50 text-shikho-coral-500' : 'bg-shikho-indigo-50 text-shikho-indigo-600'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-shikho-sunrise-500 bg-shikho-sunrise-500/10 px-3 py-1 rounded-full">
            {currentQuestion.type}
          </span>
          <span className="text-sm font-medium text-gray-400 font-poppins">Marks: {currentQuestion.marks}</span>
        </div>

        <h2 className="text-lg text-gray-900 font-bengali leading-relaxed mb-8">
          {currentQuestion.content}
        </h2>

        {/* Answer Input Area */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">Your Answer</label>
          <textarea 
            rows={6}
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => setAnswers({...answers, [currentQuestion.id]: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 font-bengali text-base shadow-sm"
            placeholder="Type your answer here..."
            disabled={isSubmitting}
          ></textarea>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={handlePrev} 
          disabled={currentQuestionIdx === 0 || isSubmitting}
          className="px-6 py-2.5 rounded-lg font-poppins font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Previous
        </button>
        
        {currentQuestionIdx === questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-shikho-coral-500 text-white rounded-lg font-poppins font-medium hover:bg-red-600 transition-colors shadow-ambient disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-shikho-indigo-600 text-white rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors shadow-ambient disabled:opacity-50"
          >
            Next Question
          </button>
        )}
      </div>

    </div>
  )
}
