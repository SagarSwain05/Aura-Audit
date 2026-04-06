'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Flame, CheckCircle2, XCircle, DollarSign, Briefcase } from 'lucide-react'
import type { JobMatch } from '@/types'
import { getDemandColor, getDemandIcon } from '@/lib/utils'

interface CareerMatchCardProps {
  match: JobMatch
  rank: number
  onViewRoadmap?: (role: string, missingSkills: string[]) => void
}

const RANK_GRADIENT = [
  'from-yellow-500 to-amber-600',
  'from-slate-400 to-slate-500',
  'from-orange-600 to-orange-700',
]

export default function CareerMatchCard({ match, rank, onViewRoadmap }: CareerMatchCardProps) {
  const rankLabel = ['1st', '2nd', '3rd'][rank - 1] || `${rank}th`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (rank - 1) * 0.1 }}
      className="glass-card-hover p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${RANK_GRADIENT[rank - 1] || 'from-purple-500 to-violet-600'} flex items-center justify-center text-white font-black text-sm shadow-md shrink-0`}>
            {rank}
          </div>
          <div>
            <h3 className="font-bold leading-tight">{match.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium ${getDemandColor(match.demand_level)}`}>
                {getDemandIcon(match.demand_level)} {match.demand_level}
              </span>
              <span className="text-aura-muted text-xs">·</span>
              <span className="text-xs text-aura-muted flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {match.salary_range}
              </span>
            </div>
          </div>
        </div>

        {/* Match % ring */}
        <div className="shrink-0 relative w-14 h-14">
          <svg width="56" height="56" className="-rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1E1E2E" strokeWidth="4" />
            <motion.circle
              cx="28" cy="28" r="22"
              fill="none"
              stroke={match.match_percentage >= 80 ? '#10B981' : match.match_percentage >= 60 ? '#06B6D4' : '#F59E0B'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="138"
              initial={{ strokeDashoffset: 138 }}
              animate={{ strokeDashoffset: 138 - (138 * match.match_percentage) / 100 }}
              transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: (rank - 1) * 0.1 + 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-white leading-none">{match.match_percentage}%</span>
            <span className="text-[8px] text-aura-muted">match</span>
          </div>
        </div>
      </div>

      {/* Match progress bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-aura-border rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: match.match_percentage >= 80
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : match.match_percentage >= 60
                ? 'linear-gradient(90deg, #06B6D4, #38BDF8)'
                : 'linear-gradient(90deg, #F59E0B, #FCD34D)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${match.match_percentage}%` }}
            transition={{ duration: 1, delay: (rank - 1) * 0.1 + 0.2 }}
          />
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-3 mb-4">
        {match.matched_skills.length > 0 && (
          <div>
            <p className="text-[10px] text-green-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> You have ({match.matched_skills.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.matched_skills.map((skill) => (
                <span key={skill} className="text-[11px] px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {match.missing_skills.length > 0 && (
          <div>
            <p className="text-[10px] text-red-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> You need ({match.missing_skills.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.missing_skills.map((skill) => (
                <span key={skill} className="text-[11px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      {match.missing_skills.length > 0 && onViewRoadmap && (
        <button
          onClick={() => onViewRoadmap(match.title, match.missing_skills)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-aura-purple/30 bg-aura-purple/10 text-aura-purple-light hover:bg-aura-purple/20 transition-all flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Bridge the Gap — Get Roadmap
        </button>
      )}
    </motion.div>
  )
}
