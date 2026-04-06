'use client'

import { motion } from 'framer-motion'
import { BarChart3, MapPin, TrendingUp } from 'lucide-react'

interface MarketDemandPulseProps {
  demand: Record<string, number>
  meta: {
    trending: string[]
    hot_cities: Record<string, string[]>
  }
}

const CITY_EMOJI: Record<string, string> = {
  Bangalore: '🇮🇳',
  Hyderabad: '🇮🇳',
  London: '🇬🇧',
  'New York': '🇺🇸',
}

export default function MarketDemandPulse({ demand, meta }: MarketDemandPulseProps) {
  const sorted = Object.entries(demand)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const maxDemand = sorted[0]?.[1] || 100

  return (
    <div className="space-y-5">
      {/* Skill demand bars */}
      <div className="glass-card p-5">
        <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-aura-purple" />
          Market Demand for Your Skills
        </h4>
        <div className="space-y-3">
          {sorted.map(([skill, pct], i) => (
            <div key={skill} className="flex items-center gap-3">
              <span className="text-xs text-aura-muted-light w-24 shrink-0 truncate">{skill}</span>
              <div className="flex-1 h-2 bg-aura-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: pct >= 85
                      ? 'linear-gradient(90deg, #EF4444, #F97316)'
                      : pct >= 70
                      ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                      : 'linear-gradient(90deg, #06B6D4, #38BDF8)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(pct / maxDemand) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                />
              </div>
              <div className="flex items-center gap-1 w-14 shrink-0">
                <span className="text-xs font-semibold text-aura-text">{pct}%</span>
                {pct >= 85 && <span className="text-[10px]">🔥</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending skills */}
      {meta.trending?.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aura-cyan" />
            Trending Skills to Add
          </h4>
          <div className="flex flex-wrap gap-2">
            {meta.trending.map((skill) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs px-3 py-1.5 rounded-full border border-aura-cyan/30 bg-aura-cyan/10 text-aura-cyan font-medium"
              >
                + {skill}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Hot cities */}
      {Object.keys(meta.hot_cities || {}).length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-aura-red" />
            Hiring Temperature by City
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(meta.hot_cities).map(([city, skills]) => (
              <div key={city} className="bg-aura-surface rounded-xl p-3 border border-aura-border">
                <p className="text-xs font-semibold mb-2">
                  {CITY_EMOJI[city] || '🌍'} {city}
                </p>
                <div className="space-y-1">
                  {(skills as string[]).slice(0, 3).map((skill) => (
                    <div key={skill} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-aura-purple shrink-0" />
                      <span className="text-[11px] text-aura-muted">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
