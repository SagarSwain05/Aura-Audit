'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Brain, ArrowLeft, Mic, MicOff, Timer, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuditStore } from '@/store/useAuditStore'
import Link from 'next/link'

export default function InterviewPage() {
  const { currentAudit } = useAuditStore()
  const router = useRouter()
  const [currentQ, setCurrentQ] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [timer, setTimer] = useState(120) // 2 min per question
  const [running, setRunning] = useState(false)

  const questions = currentAudit?.interviewQuestions || []

  useEffect(() => {
    if (!running) return
    if (timer === 0) { setRunning(false); return }
    const t = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [running, timer])

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1)
      setRevealed(false)
      setTimer(120)
      setRunning(false)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-aura-bg">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 text-center">
          <Brain className="w-12 h-12 text-aura-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Interview Questions</h2>
          <p className="text-aura-muted mb-6">Generate questions from your audit results first.</p>
          <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  const mins = Math.floor(timer / 60)
  const secs = timer % 60

  const DIFFICULTY_COLORS = {
    easy: 'text-green-400 border-green-500/30 bg-green-500/10',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    hard: 'text-red-400 border-red-500/30 bg-red-500/10',
  }

  return (
    <div className="min-h-screen bg-aura-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-aura-muted hover:text-aura-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-xl">Interview Simulator</h1>
            <p className="text-xs text-aura-muted">Question {currentQ + 1} of {questions.length}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-aura-border rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-aura-gradient rounded-full"
            animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8"
        >
          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`badge text-xs ${DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.medium}`}>
              {q.difficulty}
            </span>
            <span className="badge text-xs bg-aura-surface border-aura-border text-aura-muted">
              {q.category.replace('_', ' ')}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-lg font-semibold leading-relaxed mb-6">{q.question}</h2>

          {/* Timer */}
          <div className="flex items-center justify-between mb-6">
            <div className={`flex items-center gap-2 text-sm font-mono ${
              timer < 30 ? 'text-red-400' : 'text-aura-muted'
            }`}>
              <Timer className="w-4 h-4" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRunning(!running)}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all ${
                  running
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-aura-green/30 bg-aura-green/10 text-aura-green'
                }`}
              >
                {running ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {running ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>

          {/* Hint */}
          <button
            onClick={() => setRevealed(!revealed)}
            className="w-full py-3 rounded-xl border border-aura-border text-aura-muted text-sm hover:border-aura-purple/30 hover:text-aura-purple-light transition-all"
          >
            {revealed ? 'Hide Hint' : 'Reveal Hint'}
          </button>

          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-4 rounded-xl bg-aura-purple/10 border border-aura-purple/20"
            >
              <p className="text-xs text-aura-purple-light font-semibold mb-1">Strong answers cover:</p>
              <p className="text-sm text-aura-muted-light">{q.hint}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => { setCurrentQ(c => Math.max(0, c - 1)); setRevealed(false); setTimer(120); setRunning(false) }}
            disabled={currentQ === 0}
            className="btn-secondary py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          {currentQ < questions.length - 1 ? (
            <button onClick={nextQuestion} className="btn-primary py-2 text-sm flex items-center gap-2">
              Next Question <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary py-2 text-sm">Finish Session</Link>
          )}
        </div>
      </div>
    </div>
  )
}
