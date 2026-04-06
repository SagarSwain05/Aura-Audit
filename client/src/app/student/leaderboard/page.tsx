'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star, Award, Crown, Medal } from 'lucide-react'
import { studentApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'

interface LeaderboardEntry {
  _id: string
  name: string
  department?: string
  careerReadinessScore: number
  careerPoints: { total: number }
  badges: { type: string }[]
  rank: { overall: number }
}

const BADGE_ICONS: Record<string, React.ReactElement> = {
  platinum: <Crown className="w-3.5 h-3.5 text-cyan-300" />,
  gold: <Trophy className="w-3.5 h-3.5 text-yellow-400" />,
  silver: <Medal className="w-3.5 h-3.5 text-gray-300" />,
  bronze: <Award className="w-3.5 h-3.5 text-orange-400" />,
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400',
  2: 'bg-gray-300/20 border-gray-300/40 text-gray-300',
  3: 'bg-orange-400/20 border-orange-400/40 text-orange-400',
}

export default function LeaderboardPage() {
  const { user } = useAuditStore()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'overall' | 'branch'>('overall')

  useEffect(() => {
    studentApi.getLeaderboard().then((r) => {
      setLeaderboard(r.data.leaderboard || [])
    }).finally(() => setLoading(false))
  }, [])

  const myIndex = leaderboard.findIndex((e) => e.name === user?.name)

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-aura-muted text-sm mt-1">Top performers in career readiness</p>
      </div>

      {/* Top 3 podium */}
      {!loading && leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-4">
          {[1, 0, 2].map((pos) => {
            const entry = leaderboard[pos]
            if (!entry) return null
            const heights = ['h-28', 'h-36', 'h-24']
            const ranks = [2, 1, 3]
            const rank = ranks[pos === 0 ? 1 : pos === 1 ? 0 : 2]
            const h = heights[pos === 0 ? 1 : pos === 1 ? 0 : 2]
            return (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pos * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-aura-gradient flex items-center justify-center text-white font-bold text-sm">
                  {entry.name.charAt(0)}
                </div>
                <p className="text-xs font-semibold text-center w-20 truncate">{entry.name}</p>
                <div className={`w-20 ${h} rounded-t-xl border flex items-center justify-center ${RANK_STYLES[rank] || 'bg-white/5 border-white/10'}`}>
                  <span className="text-lg font-black">#{rank}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* My rank */}
      {myIndex >= 0 && (
        <div className="glass-card p-4 border-aura-purple/30 bg-aura-purple/5">
          <div className="flex items-center gap-3">
            <span className="text-aura-purple-light font-bold">Your rank: #{myIndex + 1}</span>
            <span className="text-aura-muted text-sm">·</span>
            <span className="text-sm text-aura-muted">{leaderboard[myIndex]?.careerPoints?.total || 0} pts</span>
          </div>
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const isMe = entry.name === user?.name
            const rankStyle = RANK_STYLES[i + 1]
            return (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card p-4 flex items-center gap-4 ${isMe ? 'border-aura-purple/30 bg-aura-purple/5' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rankStyle || 'bg-white/5 text-aura-muted border border-white/5'}`}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {entry.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{entry.name} {isMe && <span className="text-aura-purple-light text-xs">(you)</span>}</p>
                    {entry.badges?.slice(0, 2).map((b, bi) => (
                      <span key={bi}>{BADGE_ICONS[b.type]}</span>
                    ))}
                  </div>
                  {entry.department && <p className="text-xs text-aura-muted">{entry.department}</p>}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-bold text-sm">{entry.careerPoints?.total || 0}</span>
                  </div>
                  <p className="text-xs text-aura-muted">{entry.careerReadinessScore ?? 0}% ready</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
