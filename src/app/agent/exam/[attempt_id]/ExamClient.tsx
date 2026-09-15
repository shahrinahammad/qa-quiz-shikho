'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitEvaluation } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function ExamClient({ attempt, questions }: { attempt: any, questions: any[] }) {
  const router = useRouter()
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [audioAnswers, setAudioAnswers] = useState<Record<string, Blob>>({})
  const [timeLeft, setTimeLeft] = useState(attempt.evaluations.duration_minutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  // অডিও রেকর্ডিংয়ের জন্য নতুন টগল লজিক
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

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

  // বাংলা ভয়েস টাইপিং
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Use Google Chrome for voice typing."); return }
    if (isListening) { setIsListening(false); return; }

    const recognition = new SpeechRecognition()
    recognition.lang = 'bn-BD'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
      }
      if (finalTranscript) {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: (prev[currentQuestion.id] ? prev[currentQuestion.id] + ' ' : '') + finalTranscript.trim() }))
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  // ফিক্সড: অডিও রেকর্ডিং টগল (Click to Start / Stop)
  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
      setIsRecordingAudio(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        const chunks: BlobPart[] = []

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          setAudioAnswers(prev => ({ ...prev, [currentQuestion.id]: blob }))
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecordingAudio(true)
      } catch (err) {
        alert("Please allow microphone permissions to record audio.")
      }
    }
  }

  const removeAudio = () => {
    const updatedAudio = { ...audioAnswers }
    delete updatedAudio[currentQuestion.id]
    setAudioAnswers(updatedAudio)
  }

  const handleSubmit = async () => {
    const answeredCount = Array.from(new Set([...Object.keys(answers), ...Object.keys(audioAnswers)])).length
    if (!window.confirm(`You have answered ${answeredCount} out of ${questions.length} questions.\n\nSubmit?`)) return;

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const audioUrls: Record<string, string> = {}

      for (const [qId, blob] of Object.entries(audioAnswers)) {
        const fileName = `${attempt.attempt_id}_${qId}_${Date.now()}.webm`
        const { data } = await supabase.storage.from('audio-answers').upload(fileName, blob)
        if (data) {
          const { data: publicUrlData } = supabase.storage.from('audio-answers').getPublicUrl(fileName)
          audioUrls[qId] = publicUrlData.publicUrl
        }
      }
      await submitEvaluation(attempt.attempt_id, answers, audioUrls)
      router.push('/agent/dashboard')
    } catch (error) {
      alert("Submission failed.")
      setIsSubmitting(false)
    }
  }

  if (!currentQuestion) return <div className="text-center p-10">Loading...</div>

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
        <h2 className="text-lg text-gray-900 font-bengali leading-relaxed mb-8">{currentQuestion.content}</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={toggleListening} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {isListening ? '🔴 Typing...' : '🎤 Bengali Voice Typing'}
          </button>
          
          {!audioAnswers[currentQuestion.id] && (
            <button onClick={toggleAudioRecording} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isRecordingAudio ? 'bg-red-600 text-white animate-pulse' : 'bg-shikho-indigo-50 text-shikho-indigo-600 hover:bg-shikho-indigo-100'}`}>
              {isRecordingAudio ? '🛑 Click to Stop Recording' : '🎙️ Click to Record Audio'}
            </button>
          )}
        </div>

        {audioAnswers[currentQuestion.id] && (
          <div className="mb-4 p-4 bg-shikho-indigo-50 rounded-xl flex items-center gap-4">
            <audio src={URL.createObjectURL(audioAnswers[currentQuestion.id])} controls className="h-10 w-full max-w-sm" />
            <button onClick={removeAudio} className="text-sm text-shikho-coral-500 hover:underline">Remove</button>
          </div>
        )}

        <textarea 
          rows={5} value={answers[currentQuestion.id] || ''} onChange={(e) => setAnswers({...answers, [currentQuestion.id]: e.target.value})}
          className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-shikho-indigo-500 font-bengali text-base"
          placeholder="Type answer, use voice typing, or record audio directly..." disabled={isSubmitting}
        ></textarea>
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
