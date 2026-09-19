'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrendingUp, Users, Brain, ChevronRight, Loader2, X, Sparkles, CheckCircle2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface InterventionAction {
  category: 'skill' | 'workshop' | 'counseling' | 'mentorship'
  action: string
}

interface LastSuggestion {
  suggestedAt: string
  summary: string
  actions: InterventionAction[]
}

interface AtRiskStudent {
  _id: string
  name: string
  email: string
  department?: string
  year?: number
  cgpa?: number
  careerReadinessScore: number
  riskLevel: 'critical' | 'high' | 'medium'
  riskFactors: string[]
  skills: { name: string }[]
  lastSuggestion?: LastSuggestion | null
}

const RISK_COLORS = {
  critical: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  medium: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
}

const RISK_ICONS = {
  critical: <AlertTriangle className="w-4 h-4 text-red-400" />,
  high: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  medium: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
}

const CATEGORY_LABEL: Record<string, string> = {
  skill: 'Skill to learn',
  workshop: 'Workshop',
  counseling: 'Counseling',
  mentorship: 'Mentorship',
}

export default function InterventionPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all')
  const [suggestingId, setSuggestingId] = useState<string | null>(null)
  const [planModal, setPlanModal] = useState<{ student: AtRiskStudent; summary: string; actions: InterventionAction[] } | null>(null)

  const load = () => {
    setLoading(true)
    universityApi.getAtRiskStudents().then((r) => {
      setStudents(r.data.students || r.data.atRiskStudents || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const counts = {
    critical: students.filter((s) => s.riskLevel === 'critical').length,
    high: students.filter((s) => s.riskLevel === 'high').length,
    medium: students.filter((s) => s.riskLevel === 'medium').length,
  }

  const filtered = filter === 'all' ? students : students.filter((s) => s.riskLevel === filter)

  const handleSuggestAction = async (student: AtRiskStudent) => {
    setSuggestingId(student._id)
    try {
      const r = await universityApi.suggestAction(student._id)
      const { summary, actions } = r.data.intervention
      setPlanModal({ student, summary, actions })
      toast.success(`Action plan sent to ${student.name}`)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'AI engine unavailable — try again shortly')
    } finally {
      setSuggestingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Intervention Planner</h1>
        <p className="text-aura-muted text-sm mt-1">Students requiring immediate career support (score &lt; 40)</p>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { level: 'critical' as const, label: 'Critical', icon: AlertTriangle, count: counts.critical },
          { level: 'high' as const, label: 'High Risk', icon: TrendingUp, count: counts.high },
          { level: 'medium' as const, label: 'Medium Risk', icon: Users, count: counts.medium },
        ].map((r) => (
          <motion.button
            key={r.level}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setFilter(filter === r.level ? 'all' : r.level)}
            className={`glass-card p-4 text-left transition-all ${filter === r.level ? `${RISK_COLORS[r.level].border} ${RISK_COLORS[r.level].bg}` : 'hover:border-white/10'}`}
          >
            <r.icon className={`w-5 h-5 ${RISK_COLORS[r.level].text} mb-2`} />
            <p className={`text-2xl font-black ${RISK_COLORS[r.level].text}`}>{r.count}</p>
            <p className="text-xs text-aura-muted">{r.label}</p>
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">{filter === 'all' ? 'No at-risk students detected — great job!' : `No ${filter} risk students`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const rc = RISK_COLORS[s.riskLevel]
            return (
              <motion.div
                key={s._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={`glass-card p-5 border ${rc.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${rc.bg} flex items-center justify-center flex-shrink-0`}>
                    {RISK_ICONS[s.riskLevel]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{s.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${rc.text} ${rc.bg}`}>{s.riskLevel}</span>
                          {s.lastSuggestion && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Plan sent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-aura-muted mt-0.5">
                          {s.department && `${s.department} · `}
                          {s.year && `Year ${s.year} · `}
                          {s.cgpa != null && `CGPA ${s.cgpa}`}
                        </p>
                      </div>
                      <div className={`text-2xl font-black ${rc.text}`}>{s.careerReadinessScore}%</div>
                    </div>

                    {(s.skills?.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.skills.slice(0, 6).map((sk) => (
                          <span key={sk.name} className="text-xs px-2 py-0.5 bg-aura-purple/10 text-aura-purple-light rounded-lg">{sk.name}</span>
                        ))}
                      </div>
                    )}

                    {(s.riskFactors?.length > 0) && (
                      <div className="mt-2">
                        <p className="text-xs text-aura-muted mb-1">Risk Factors:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.riskFactors.map((f, fi) => (
                            <span key={fi} className="text-xs px-2 py-0.5 bg-white/5 text-aura-muted rounded-lg">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <Link
                        href={`/tpo/students/${s._id}`}
                        className="text-xs text-aura-purple-light hover:underline flex items-center gap-1"
                      >
                        View profile <ChevronRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => s.lastSuggestion
                          ? setPlanModal({ student: s, summary: s.lastSuggestion.summary, actions: s.lastSuggestion.actions })
                          : handleSuggestAction(s)}
                        disabled={suggestingId === s._id}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {suggestingId === s._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                        {suggestingId === s._id ? 'Analyzing...' : s.lastSuggestion ? 'View Plan' : 'Suggest Action'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Intervention guide */}
      <div className="glass-card p-5 bg-aura-purple/5 border-aura-purple/20">
        <h3 className="font-semibold text-sm mb-3">Recommended Interventions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-aura-muted">
          {[
            { label: 'Critical (0-20%)', actions: ['Individual counselling', 'Assign mentor', 'Basic skill bootcamp'] },
            { label: 'High (20-30%)', actions: ['Group workshops', 'Targeted assessments', 'Resume review'] },
            { label: 'Medium (30-40%)', actions: ['Skill-gap workshops', 'Mock interviews', 'Job readiness sessions'] },
          ].map((g) => (
            <div key={g.label} className="p-3 bg-white/5 rounded-xl">
              <p className="font-semibold text-aura-text mb-1.5">{g.label}</p>
              {g.actions.map((a) => <p key={a} className="flex items-start gap-1.5 mb-1"><span className="text-aura-purple mt-0.5">•</span>{a}</p>)}
            </div>
          ))}
        </div>
      </div>

      {/* Suggested action plan modal */}
      <AnimatePresence>
        {planModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-aura-purple-light" /> Action Plan — {planModal.student.name}
                </h2>
                <button onClick={() => setPlanModal(null)} className="text-aura-muted hover:text-aura-text"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-aura-muted mb-4">Sent to the student as a notification.</p>
              <p className="text-sm text-aura-muted-light mb-4">{planModal.summary}</p>
              <div className="space-y-2">
                {planModal.actions.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] uppercase tracking-wide text-aura-purple-light font-semibold">{CATEGORY_LABEL[a.category] || a.category}</span>
                    <p className="text-sm mt-0.5">{a.action}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setPlanModal(null)} className="btn-primary w-full text-sm px-4 py-2.5 mt-5">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
