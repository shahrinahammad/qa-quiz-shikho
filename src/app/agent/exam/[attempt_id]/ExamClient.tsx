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
  const [isListening, setIsListening] = useState(false)

  // Timer Logic
  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timerId)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIdx]
  const progress = Math.round(((currentQuestionIdx + 1) / questions.length) * 100)

  const handleNext = () => { if (currentQuestionIdx < questions.length - 1) setCurrentQuestionIdx(idx => idx + 1) }
  const handlePrev = () => { if (currentQuestionIdx > 0) setCurrentQuestionIdx(idx => idx - 1) }

  // বাংলা ভয়েস টাইপিং লজিক (TypeScript error fully fixed here)
  const toggleListening = () => {
    // এখন দুটোর আগেই (window as any) দেওয়া হয়েছে
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert("Voice typing is not supported in this browser. Please use Google Chrome.")
      return
    }

    if (isListening) { setIsListening(false); return; }

    const recognition = new SpeechRecognition()
    recognition.lang = 'bn-BD' // বাংলা ভাষা
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      let currentTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript
      }
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || '') + ' ' + currentTranscript
      }))
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).filter(k => answers[k].trim() !== '').length;
    if (!window.confirm(`You have answered ${answeredCount} out of ${questions.length} questions.\n\nSubmit?`)) return;

    setIsSubmitting(true)
    try {
      await submitEvaluation(attempt.attempt_id, answers)
      router.push('/agent/dashboard')
    } catch (error) {
      alert("Submission failed. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (!currentQuestion) return <div className="text-center p-10">Loading questions...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 border">
        <div>
          <h1 className="text-xl font-bold font-poppins">{attempt.evaluations.title}</h1>
          <p className="text-sm text-gray-500">Question {currentQuestionIdx + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-48 bg-gray-100 h-2.5 rounded-full hidden sm:block">
            <div className="bg-shikho-magenta-500 h-full" style={{ width: `${progress}%` }}></div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${timeLeft < 300 ? 'bg-red-50 text-red-500' : 'bg-shikho-indigo-50 text-shikho-indigo-600'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <span className="text-xs font-bold uppercase text-shikho-sunrise-500 bg-shikho-sunrise-500/10 px-3 py-1 rounded-full">{currentQuestion.type}</span>
          <span className="text-sm font-medium text-gray-400">Marks: {currentQuestion.marks}</span>
        </div>
        <h2 className="text-lg text-gray-900 font-bengali leading-relaxed mb-6">{currentQuestion.content}</h2>

        <div className="mt-4 relative">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Your Answer</label>
            <button 
              onClick={toggleListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {isListening ? '🔴 Recording...' : '🎤 Bengali Voice Typing'}
            </button>
          </div>
          <textarea 
            rows={6}
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => setAnswers({...answers, [currentQuestion.id]: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-shikho-indigo-500 font-bengali text-base"
            placeholder="Type your answer or use the microphone..."
            disabled={isSubmitting}
          ></textarea>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
        <button onClick={handlePrev} disabled={currentQuestionIdx === 0 || isSubmitting} className="px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50">Previous</button>
        {currentQuestionIdx === questions.length - 1 ? (
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2.5 bg-shikho-coral-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        ) : (
          <button onClick={handleNext} disabled={isSubmitting} className="px-8 py-2.5 bg-shikho-indigo-600 text-white rounded-lg hover:bg-shikho-indigo-700 disabled:opacity-50">Next Question</button>
        )}
      </div>
    </div>
  )
}
