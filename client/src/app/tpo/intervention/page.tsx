'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, Users, Brain, ChevronRight, Loader2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import Link from 'next/link'

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
  missingSkills?: string[]
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

export default function InterventionPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all')

  useEffect(() => {
    universityApi.getAtRiskStudents().then((r) => {
      setStudents(r.data.students || r.data.atRiskStudents || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const counts = {
    critical: students.filter((s) => s.riskLevel === 'critical').length,
    high: students.filter((s) => s.riskLevel === 'high').length,
    medium: students.filter((s) => s.riskLevel === 'medium').length,
  }

  const filtered = filter === 'all' ? students : students.filter((s) => s.riskLevel === filter)

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
                        </div>
                        <p className="text-xs text-aura-muted mt-0.5">
                          {s.department && `${s.department} · `}
                          {s.year && `Year ${s.year} · `}
                          {s.cgpa && `CGPA ${s.cgpa}`}
                        </p>
                      </div>
                      <div className={`text-2xl font-black ${rc.text}`}>{s.careerReadinessScore}%</div>
                    </div>

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

                    <div className="flex gap-3 mt-3">
                      <Link
                        href={`/tpo/students/${s._id}`}
                        className="text-xs text-aura-purple-light hover:underline flex items-center gap-1"
                      >
                        View profile <ChevronRight className="w-3 h-3" />
                      </Link>
                      <button className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Suggest Action
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
    </div>
  )
}
