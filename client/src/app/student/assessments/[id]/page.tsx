'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, CheckCircle, XCircle, Award, Timer, ChevronRight, ChevronLeft,
  Loader2, AlertTriangle, Code2, MessageSquare, HelpCircle, ToggleLeft,
} from 'lucide-react'
import { assessmentApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Question {
  id: string
  type: 'mcq' | 'coding' | 'code' | 'true_false' | 'short_answer'
  question: string
  options?: string[]
  points: number
  hints?: string[]
}

interface Assessment {
  _id: string
  skill: string
  level: string
  status: string
  questions: Question[]
  evaluationResult?: {
    percentage: number
    passed: boolean
    totalScore: number
    results: { questionId: string; isCorrect: boolean; score: number; feedback: string }[]
  }
  feedback?: {
    strengths: string[]
    areas_for_improvement: string[]
    recommendations: string[]
    motivationalQuote: string
    estimated_readiness_days: number
  }
  certificateIssued: boolean
  createdAt: string
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  mcq:          { label: 'Multiple Choice', color: 'bg-aura-purple/10 text-aura-purple-light border-aura-purple/20', icon: HelpCircle },
  coding:       { label: 'Coding',          color: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',               icon: Code2 },
  code:         { label: 'Coding',          color: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',               icon: Code2 },
  true_false:   { label: 'True / False',    color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',      icon: ToggleLeft },
  short_answer: { label: 'Short Answer',    color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',         icon: MessageSquare },
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(1200) // 20 min
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  // Use ref to avoid stale closure in timer for auto-submit
  const assessmentRef = useRef<Assessment | null>(null)
  assessmentRef.current = assessment

  useEffect(() => {
    assessmentApi.getById(id)
      .then((r) => setAssessment(r.data.assessment))
      .catch(() => router.push('/student/assessments'))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSubmit = useCallback(async (_autoSubmit = false) => {
    const a = assessmentRef.current
    if (!a) return
    setSubmitting(true)
    setShowSubmitConfirm(false)
    try {
      await assessmentApi.submit(a._id, answers)
      toast.success('Submitted! Evaluating your answers...')
      const r = await assessmentApi.getById(a._id)
      setAssessment(r.data.assessment)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [assessment, answers]) // eslint-disable-line

  // Timer — starts when assessment is in_progress, uses ref for auto-submit to avoid stale closure
  useEffect(() => {
    if (!assessment || assessment.status !== 'in_progress') return
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t)
          handleSubmit(true) // auto-submit with current answers via ref
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [assessment?._id, assessment?.status, handleSubmit])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-aura-purple" />
        <p className="text-aura-muted text-sm">Loading assessment...</p>
      </div>
    </div>
  )

  if (!assessment) return null

  const isEvaluated = assessment.status === 'evaluated'
  const questions = assessment.questions || []
  const q = questions[current]
  const answeredCount = Object.keys(answers).length
  const unansweredCount = questions.length - answeredCount

  // ── Results view ──────────────────────────────────────────────────────────
  if (isEvaluated && assessment.evaluationResult) {
    const { percentage, passed, totalScore, results } = assessment.evaluationResult
    const fb = assessment.feedback

    return (
      <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto w-full">
        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${passed ? 'bg-emerald-400/20' : 'bg-red-400/20'}`}>
            {passed ? <CheckCircle className="w-10 h-10 text-emerald-400" /> : <XCircle className="w-10 h-10 text-red-400" />}
          </div>
          <h1 className="text-4xl font-black mb-1">{percentage}%</h1>
          <p className={`text-lg font-semibold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {passed ? 'Passed!' : 'Not Passed'}
          </p>
          <p className="text-aura-muted text-sm">{totalScore} pts · {assessment.skill} · {assessment.level}</p>
          {assessment.certificateIssued && (
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold">
              <Award className="w-4 h-4" /> Certificate Issued · +50 Career Points
            </div>
          )}
        </motion.div>

        {/* Feedback */}
        {fb && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fb.strengths?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-3 text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Strengths
                </h3>
                <ul className="space-y-2">
                  {fb.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-aura-muted-light flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fb.areas_for_improvement?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-3 text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Improve
                </h3>
                <ul className="space-y-2">
                  {fb.areas_for_improvement.map((s, i) => (
                    <li key={i} className="text-sm text-aura-muted-light flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fb.motivationalQuote && (
              <div className="sm:col-span-2 glass-card p-5 border-l-2 border-aura-purple">
                <p className="text-sm italic text-aura-muted-light">"{fb.motivationalQuote}"</p>
              </div>
            )}
          </div>
        )}

        {/* Per-question breakdown */}
        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-semibold mb-4">Question Breakdown</h3>
          <div className="space-y-2.5">
            {questions.map((qItem, i) => {
              const r = results?.find((x) => x.questionId === qItem.id)
              return (
                <div key={qItem.id} className={`flex items-start gap-3 p-3.5 rounded-xl ${r?.isCorrect ? 'bg-emerald-400/5 border border-emerald-400/10' : 'bg-red-400/5 border border-red-400/10'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${r?.isCorrect ? 'bg-emerald-400/20' : 'bg-red-400/20'}`}>
                    {r?.isCorrect
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Q{i + 1}: {qItem.question.slice(0, 100)}{qItem.question.length > 100 ? '...' : ''}</p>
                    {r?.feedback && <p className="text-xs text-aura-muted mt-1">{r.feedback}</p>}
                  </div>
                  <span className="text-sm font-bold flex-shrink-0">{r?.score ?? 0}/{qItem.points}</span>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={() => router.push('/student/assessments')} className="btn-secondary w-full py-3">
          Back to Assessments
        </button>
      </div>
    )
  }

  // ── Taking assessment view ─────────────────────────────────────────────────
  if (!q) return null
  const progress = (answeredCount / questions.length) * 100
  const meta = TYPE_META[q.type] || TYPE_META.short_answer
  const isCoding = q.type === 'coding' || q.type === 'code'

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-b border-white/5 bg-aura-card/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="font-bold text-base sm:text-lg">{assessment.skill} Assessment</h1>
              <p className="text-xs text-aura-muted capitalize mt-0.5">{assessment.level} · {questions.length} questions</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold ${timeLeft < 300 ? 'bg-red-400/10 text-red-400' : 'bg-white/5 text-aura-muted'}`}>
              <Timer className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-aura-muted mb-1">
              <span>{answeredCount}/{questions.length} answered</span>
              <span>Q{current + 1} of {questions.length}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-aura-gradient rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-4">
          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card overflow-hidden"
            >
              {/* Question header */}
              <div className={`flex items-center gap-2 px-5 py-3 border-b border-white/5 ${isCoding ? 'bg-cyan-400/5' : 'bg-white/2'}`}>
                <meta.icon className={`w-4 h-4 flex-shrink-0 ${isCoding ? 'text-cyan-400' : 'text-aura-muted'}`} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="ml-auto text-xs text-aura-muted font-semibold">{q.points} pts</span>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Question text */}
                <p className="text-base sm:text-lg font-medium leading-relaxed">{q.question}</p>

                {/* Hints */}
                {q.hints && q.hints.length > 0 && (
                  <div className="p-3 bg-aura-purple/5 border border-aura-purple/15 rounded-xl">
                    <p className="text-xs text-aura-purple-light font-semibold mb-1">Hint</p>
                    {q.hints.map((h, i) => <p key={i} className="text-xs text-aura-muted">{h}</p>)}
                  </div>
                )}

                {/* MCQ options */}
                {q.type === 'mcq' && q.options && (
                  <div className="space-y-2.5">
                    {q.options.map((opt, i) => (
                      <button
                        key={`${q.id}-opt-${i}`}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`w-full text-left px-4 py-3.5 rounded-xl text-sm border transition-all ${
                          answers[q.id] === opt
                            ? 'border-aura-purple bg-aura-purple/10 text-aura-text font-medium'
                            : 'border-white/8 bg-white/3 text-aura-muted hover:border-white/15 hover:bg-white/5'
                        }`}
                      >
                        <span className="font-bold mr-2.5 text-aura-purple-light">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* True/False */}
                {q.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map((opt) => {
                      const val = opt.toLowerCase()
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.id]: val })}
                          className={`py-4 rounded-xl text-sm font-semibold border transition-all ${
                            answers[q.id] === val
                              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                              : 'border-white/8 bg-white/3 text-aura-muted hover:border-white/15'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Coding question — code editor area */}
                {isCoding && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" /> Write your code below
                      </label>
                      <span className="text-xs text-aura-muted">
                        {(answers[q.id] || '').length} chars
                      </span>
                    </div>
                    <div className="relative">
                      {/* Line numbers */}
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/3 border-r border-white/5 rounded-l-xl flex flex-col items-center pt-3 text-xs text-aura-muted font-mono pointer-events-none select-none overflow-hidden">
                        {Array.from({ length: Math.max(12, (answers[q.id] || '').split('\n').length + 2) }).map((_, i) => (
                          <div key={i} className="leading-6 w-full text-center text-xs">{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder={'// Write your solution here\nfunction solution() {\n  \n}'}
                        rows={14}
                        spellCheck={false}
                        className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-12 pr-4 pt-3 pb-3 text-sm text-aura-text placeholder-aura-muted/40 focus:outline-none focus:border-cyan-400/50 resize-y font-mono leading-6 min-h-[200px]"
                        style={{ tabSize: 2 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault()
                            const start = e.currentTarget.selectionStart
                            const end = e.currentTarget.selectionEnd
                            const val = e.currentTarget.value
                            const newVal = val.substring(0, start) + '  ' + val.substring(end)
                            setAnswers({ ...answers, [q.id]: newVal })
                            setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0)
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-aura-muted">Tab key inserts 2 spaces. Write clean, commented code.</p>
                  </div>
                )}

                {/* Short answer */}
                {q.type === 'short_answer' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Your answer
                    </label>
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      placeholder="Type your answer here..."
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-aura-text placeholder-aura-muted focus:outline-none focus:border-yellow-400/50 resize-none"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Question grid navigation */}
          <div className="glass-card p-4">
            <p className="text-xs text-aura-muted font-semibold mb-2.5">Jump to question</p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    i === current
                      ? 'bg-aura-purple text-white scale-110'
                      : answers[questions[i].id]
                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                        : 'bg-white/5 text-aura-muted hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed footer nav */}
      <div className="flex-shrink-0 border-t border-white/5 bg-aura-card/80 backdrop-blur-sm p-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          {/* Submit button - always visible, not just on last question */}
          <button
            onClick={() => {
              if (unansweredCount > 0) {
                setShowSubmitConfirm(true)
              } else {
                handleSubmit()
              }
            }}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
              : <><CheckCircle className="w-4 h-4" /> Submit{unansweredCount > 0 ? ` (${unansweredCount} unanswered)` : ''}</>
            }
          </button>

          <button
            onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}
            disabled={current === questions.length - 1}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Partial submit confirmation modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-bold text-center mb-2">Submit with unanswered questions?</h3>
              <p className="text-sm text-aura-muted text-center mb-5">
                You have <span className="text-yellow-400 font-semibold">{unansweredCount}</span> unanswered question{unansweredCount > 1 ? 's' : ''}. Unanswered questions will score 0 points.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                  Go back
                </button>
                <button onClick={() => handleSubmit()} className="btn-primary flex-1 py-2.5 text-sm">
                  Submit anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
