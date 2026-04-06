'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react'
import type { InterviewQuestion } from '@/types'
import { auditApi } from '@/lib/api'
import toast from 'react-hot-toast'

const DIFFICULTY_COLOR = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const CATEGORY_COLOR = {
  technical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  behavioral: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  project: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  system_design: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

function QuestionCard({ q, index }: { q: InterviewQuestion; index: number }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-aura-surface border border-aura-border flex items-center justify-center text-sm font-bold text-aura-muted shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`badge text-[10px] ${DIFFICULTY_COLOR[q.difficulty] || DIFFICULTY_COLOR.medium}`}>
              {q.difficulty}
            </span>
            <span className={`badge text-[10px] ${CATEGORY_COLOR[q.category] || CATEGORY_COLOR.technical}`}>
              {q.category.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm font-medium text-aura-text leading-relaxed mb-3">{q.question}</p>
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 text-xs text-aura-muted hover:text-aura-purple-light transition-colors"
          >
            {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded-xl bg-aura-surface border border-aura-border overflow-hidden"
              >
                <p className="text-xs text-aura-muted-light">
                  <span className="text-aura-purple-light font-medium">Strong answer covers: </span>
                  {q.hint}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function InterviewPanel({
  questions,
  auditId,
  dreamRole,
}: {
  questions: InterviewQuestion[]
  auditId: string
  dreamRole: string
}) {
  const [qs, setQs] = useState<InterviewQuestion[]>(questions)
  const [loading, setLoading] = useState(false)

  const regenerate = async () => {
    setLoading(true)
    try {
      const res = await auditApi.generateInterview(auditId, dreamRole)
      setQs(res.data.questions || [])
      toast.success('New questions generated!')
    } catch {
      toast.error('Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Brain className="w-4 h-4 text-aura-purple" />
            Interview Simulator
          </h3>
          <p className="text-xs text-aura-muted mt-0.5">
            Questions based on YOUR specific projects — not generic
          </p>
        </div>
        <button
          onClick={regenerate}
          disabled={loading}
          className="btn-secondary py-2 text-xs flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      {qs.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-8 h-8 text-aura-muted mx-auto mb-3" />
          <p className="font-medium mb-1">No questions yet</p>
          <p className="text-aura-muted text-sm mb-4">Generate AI interview questions from your resume.</p>
          <button onClick={regenerate} disabled={loading} className="btn-primary text-sm py-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Questions'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {qs.map((q, i) => (
            <QuestionCard key={i} q={q} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
