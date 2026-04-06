'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Plus, CheckCircle, Clock, XCircle, Award, ChevronRight, Loader2, Trophy } from 'lucide-react'
import { assessmentApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Assessment {
  _id: string
  skill: string
  level: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'evaluated'
  evaluationResult?: { percentage: number; passed: boolean; totalScore: number }
  feedback?: { strengths: string[]; motivationalQuote: string }
  certificateIssued: boolean
  createdAt: string
}

const STATUS_ICONS = {
  upcoming: <Clock className="w-4 h-4 text-aura-muted" />,
  in_progress: <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />,
  completed: <Clock className="w-4 h-4 text-cyan-400" />,
  evaluated: <CheckCircle className="w-4 h-4 text-emerald-400" />,
}

const STATUS_LABELS = {
  upcoming: 'Not started',
  in_progress: 'In progress',
  completed: 'Submitted',
  evaluated: 'Evaluated',
}

const SKILL_OPTIONS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'Machine Learning',
  'Data Science', 'SQL', 'Docker', 'AWS', 'System Design', 'DSA',
]

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [skill, setSkill] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [level, setLevel] = useState('intermediate')

  const load = () => {
    assessmentApi.getAll().then((r) => setAssessments(r.data.assessments || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleGenerate = async () => {
    const targetSkill = skill === 'custom' ? customSkill : skill
    if (!targetSkill) return toast.error('Select a skill')
    setGenerating(true)
    try {
      const r = await assessmentApi.generate({ skill: targetSkill, level })
      toast.success('Assessment generated!')
      setShowModal(false)
      setSkill('')
      setCustomSkill('')
      load()
      // Navigate to take the assessment
      window.location.href = `/student/assessments/${r.data.assessment._id}`
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  const evaluated = assessments.filter((a) => a.status === 'evaluated')
  const pending = assessments.filter((a) => a.status !== 'evaluated')
  const avgScore = evaluated.length
    ? Math.round(evaluated.reduce((s, a) => s + (a.evaluationResult?.percentage || 0), 0) / evaluated.length)
    : 0

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Assessments</h1>
          <p className="text-aura-muted text-sm mt-1">10-question AI-powered skill evaluations with certificates</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: assessments.length, icon: Brain, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
          { label: 'Passed', value: evaluated.filter((a) => a.evaluationResult?.passed).length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Avg Score', value: avgScore ? `${avgScore}%` : '—', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-aura-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : assessments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Brain className="w-12 h-12 mx-auto mb-3 text-aura-purple opacity-60" />
          <h3 className="font-semibold mb-2">No assessments yet</h3>
          <p className="text-aura-muted text-sm mb-4">Take AI-powered assessments to verify your skills and earn certificates</p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm px-6 py-2">Start First Assessment</button>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a, i) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/student/assessments/${a._id}`} className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all group block">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  a.status === 'evaluated' && a.evaluationResult?.passed ? 'bg-emerald-400/10' : 'bg-white/5'
                }`}>
                  {STATUS_ICONS[a.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{a.skill}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-aura-muted capitalize">{a.level}</span>
                    {a.certificateIssued && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Certificate
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-aura-muted mt-0.5">{STATUS_LABELS[a.status]} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                {a.evaluationResult && (
                  <div className="text-right">
                    <p className={`text-lg font-bold ${a.evaluationResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.evaluationResult.percentage}%
                    </p>
                    <p className="text-xs text-aura-muted">{a.evaluationResult.passed ? 'Passed' : 'Failed'}</p>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-aura-muted group-hover:text-aura-text transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Generate AI Assessment</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-aura-muted-light mb-1.5 block">Select Skill</label>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a skill...</option>
                  {SKILL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="custom">Custom skill...</option>
                </select>
              </div>

              {skill === 'custom' && (
                <div>
                  <label className="text-sm text-aura-muted-light mb-1.5 block">Custom Skill Name</label>
                  <input type="text" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="e.g. GraphQL, Rust..." className="input-field" />
                </div>
              )}

              <div>
                <label className="text-sm text-aura-muted-light mb-1.5 block">Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                        level === l ? 'bg-aura-gradient text-white' : 'bg-white/5 text-aura-muted hover:bg-white/10'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-aura-muted">
                3 MCQ + 2 Coding + 2 True/False + 3 Short Answer = 100 points. Pass: 70+
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
