'use client'

import { motion } from 'framer-motion'
import { Target, Lightbulb, AlertTriangle, ArrowRight, CheckCircle2, Repeat2 } from 'lucide-react'
import type { GapAnalysis } from '@/types'

const IMPORTANCE_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '🔴' },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '🟠' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '🟡' },
}

export default function GapAnalysisPanel({ analysis }: { analysis: GapAnalysis }) {
  const readinessColor =
    analysis.readiness_score >= 70 ? '#10B981' :
    analysis.readiness_score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="space-y-5">
      {/* Readiness header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-aura-muted uppercase tracking-wider mb-1">Dream Role</p>
            <h3 className="font-bold text-lg">{analysis.dream_role}</h3>
          </div>
          <div className="relative w-20 h-20">
            <svg width="80" height="80" className="-rotate-90">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#1E1E2E" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="30"
                fill="none"
                stroke={readinessColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="188"
                initial={{ strokeDashoffset: 188 }}
                animate={{ strokeDashoffset: 188 - (188 * analysis.readiness_score) / 100 }}
                transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-white">{analysis.readiness_score}%</span>
              <span className="text-[9px] text-aura-muted">ready</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-aura-muted">
          {analysis.readiness_score >= 70
            ? "You're close! A few targeted skills will get you there."
            : analysis.readiness_score >= 40
            ? "Solid foundation — focused learning will bridge the gap."
            : "You'll need significant upskilling — but your transferable skills help!"}
        </p>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Your Strengths for this Role
          </h4>
          <div className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-sm text-aura-muted-light"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {s}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Transferable skills */}
      {analysis.transferable_skills.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Repeat2 className="w-4 h-4 text-aura-cyan" />
            Transferable Skills
          </h4>
          <div className="space-y-2">
            {analysis.transferable_skills.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <ArrowRight className="w-3.5 h-3.5 text-aura-cyan shrink-0 mt-0.5" />
                <span className="text-aura-muted-light">{s}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {analysis.gaps.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-aura-red" />
            Skills to Learn ({analysis.gaps.length})
          </h4>
          <div className="space-y-2">
            {analysis.gaps.map((gap, i) => {
              const cfg = IMPORTANCE_CONFIG[gap.importance] || IMPORTANCE_CONFIG.medium
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
                >
                  <span className="text-sm mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-semibold text-sm ${cfg.color}`}>{gap.skill}</span>
                      <span className="text-[10px] text-aura-muted px-1.5 py-0.5 rounded bg-aura-surface border border-aura-border">
                        {gap.category}
                      </span>
                    </div>
                    {gap.transferable_from && (
                      <p className="text-xs text-aura-muted flex items-center gap-1">
                        <Repeat2 className="w-3 h-3 text-aura-cyan shrink-0" />
                        {gap.transferable_from}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
