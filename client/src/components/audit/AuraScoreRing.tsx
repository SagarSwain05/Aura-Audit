'use client'

import { motion } from 'framer-motion'
import type { AuraScore } from '@/types'
import { getScoreColor } from '@/lib/utils'

const CIRCUMFERENCE = 2 * Math.PI * 44 // r=44

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
}

function ScoreRing({ score, size = 120, strokeWidth = 8, label, sublabel, color = '#7C3AED' }: ScoreRingProps) {
  const r = (size / 2) - strokeWidth
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * score) / 100

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#1E1E2E"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-2xl font-black text-white"
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-aura-muted">/100</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-aura-text text-center leading-tight">{label}</span>}
      {sublabel && <span className="text-[10px] text-aura-muted">{sublabel}</span>}
    </div>
  )
}

const DIMENSIONS = [
  { key: 'technical_density' as const, label: 'Technical Density', color: '#7C3AED', description: 'Depth & breadth of skills' },
  { key: 'impact_quotient' as const, label: 'Impact Quotient', color: '#F59E0B', description: 'Quantified achievements' },
  { key: 'formatting_health' as const, label: 'Formatting Health', color: '#06B6D4', description: 'ATS readability' },
  { key: 'ats_compatibility' as const, label: 'ATS Compatibility', color: '#10B981', description: '2026 ATS standards' },
]

export default function AuraScoreRing({ score }: { score: AuraScore }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg">Aura Score</h2>
          <p className="text-xs text-aura-muted">Multi-dimensional resume rating</p>
        </div>
        <div className={`text-sm font-semibold px-3 py-1.5 rounded-full border ${
          score.overall >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
          score.overall >= 60 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
          score.overall >= 40 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
          'bg-red-500/20 text-red-400 border-red-500/30'
        }`}>
          {score.overall >= 80 ? 'Excellent' : score.overall >= 60 ? 'Good' : score.overall >= 40 ? 'Needs Work' : 'Critical'}
        </div>
      </div>

      {/* Main score */}
      <div className="flex flex-col items-center mb-8">
        <ScoreRing
          score={score.overall}
          size={140}
          strokeWidth={10}
          color={score.overall >= 80 ? '#10B981' : score.overall >= 60 ? '#06B6D4' : score.overall >= 40 ? '#F59E0B' : '#EF4444'}
        />
        <p className="text-aura-muted text-sm mt-3">Overall Score</p>
      </div>

      {/* Sub-scores grid */}
      <div className="grid grid-cols-2 gap-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="bg-aura-surface rounded-xl p-3 border border-aura-border flex items-center gap-3">
            <ScoreRing
              score={score[dim.key]}
              size={56}
              strokeWidth={5}
              color={dim.color}
            />
            <div>
              <p className="text-xs font-semibold text-aura-text leading-tight">{dim.label}</p>
              <p className="text-[10px] text-aura-muted mt-0.5">{dim.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score bar summary */}
      <div className="mt-4 space-y-2">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="flex items-center gap-3">
            <span className="text-xs text-aura-muted w-28 shrink-0">{dim.label}</span>
            <div className="flex-1 h-1.5 bg-aura-border rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: dim.color }}
                initial={{ width: 0 }}
                animate={{ width: `${score[dim.key]}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <span className="text-xs font-semibold w-7 text-right" style={{ color: dim.color }}>
              {score[dim.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
