'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, BookOpen, Loader2, Zap, Star, Target, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp, Youtube, ExternalLink, Calendar,
  Award, BarChart2, Briefcase, ArrowRight,
} from 'lucide-react'
import { careerApi, studentApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

// --- Types ---
interface CareerRec {
  domain: string
  readiness_score: number
  readiness_label: string
  matched_skills: string[]
  missing_skills: string[]
  trend_score: number
  hiring_growth: string
  top_companies: string[]
  emerging_tech: string[]
  avg_package: string
  future_proof: number
  description?: string
}

interface RoadmapDay {
  day: number
  topic: string
  tasks: string[]
  resources?: { title: string; url: string; type: string }[]
}

interface RoadmapWeek {
  week?: number
  tasks?: string[]
  topic?: string
}

interface RoadmapData {
  days?: RoadmapDay[]
  weeks?: RoadmapWeek[]
  goal?: string
  total_days?: number
}

export default function CareerPage() {
  const [recommendations, setRecommendations] = useState<CareerRec[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CareerRec | null>(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [hasSkills, setHasSkills] = useState(true)

  useEffect(() => {
    Promise.all([
      careerApi.getRecommendations(),
      studentApi.getProfile(),
    ]).then(([careerRes, profileRes]) => {
      const recs: CareerRec[] = careerRes.data.recommendations || []
      setRecommendations(recs)
      if (recs.length > 0) setSelected(recs[0])
      const skills = profileRes.data.student?.skills || []
      setHasSkills(skills.length > 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleRoadmap = async (role: string) => {
    setRoadmapLoading(true)
    setRoadmap(null)
    try {
      const r = await careerApi.getRoadmap(role, 30)
      setRoadmap(r.data)
      setExpandedDay(1)
      toast.success('Roadmap generated!')
    } catch {
      toast.error('Failed to generate roadmap. Please try again.')
    } finally {
      setRoadmapLoading(false)
    }
  }

  const scorePercent = (s: number) => {
    // readiness_score can be 0-100 directly or 0-1
    return s <= 1 ? Math.round(s * 100) : Math.round(s)
  }
  const scoreColor = (s: number) => {
    const p = scorePercent(s)
    return p >= 70 ? 'text-emerald-400' : p >= 40 ? 'text-yellow-400' : 'text-red-400'
  }
  const scoreBg = (s: number) => {
    const p = scorePercent(s)
    return p >= 70 ? 'bg-emerald-400' : p >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  }

  // Normalize roadmap days from either format
  const getRoadmapDays = (): RoadmapDay[] => {
    if (!roadmap) return []
    if (roadmap.days && roadmap.days.length > 0) return roadmap.days
    if (roadmap.weeks && roadmap.weeks.length > 0) {
      return roadmap.weeks.map((w, i) => ({
        day: i + 1,
        topic: w.topic || `Week ${w.week || i + 1}`,
        tasks: w.tasks || [],
        resources: [],
      }))
    }
    return []
  }

  const roadmapDays = getRoadmapDays()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/5">
        <h1 className="text-xl sm:text-2xl font-bold">Career Recommendations</h1>
        <p className="text-aura-muted text-sm mt-0.5">AI-powered career matching + personalized roadmap with resources</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-36 rounded-2xl animate-pulse" />)}
          </div>
        ) : !hasSkills || recommendations.length === 0 ? (
          <div className="glass-card p-8 sm:p-12 text-center max-w-lg mx-auto">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h2 className="font-semibold mb-2">Add Skills to Get Started</h2>
            <p className="text-aura-muted text-sm mb-5">Your career recommendations are powered by your skill profile. Add at least 3 skills to see personalized career paths.</p>
            <Link href="/student/skills" className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2">
              <Zap className="w-4 h-4" /> Add Skills Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">

            {/* ── LEFT: Career Cards ── */}
            <div className="xl:col-span-1 space-y-2.5">
              <p className="text-xs text-aura-muted font-semibold uppercase tracking-wider mb-3">Top Career Matches</p>
              {recommendations.map((rec, i) => {
                const pct = scorePercent(rec.readiness_score)
                const isSelected = selected?.domain === rec.domain
                return (
                  <motion.button
                    key={`${rec.domain}-${i}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => { setSelected(rec); setRoadmap(null) }}
                    className={`w-full text-left glass-card p-3.5 transition-all duration-200 ${
                      isSelected ? 'border-aura-purple/60 shadow-glow-purple bg-aura-purple/5' : 'hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{rec.domain}</h3>
                        {rec.avg_package && <p className="text-xs text-emerald-400 font-medium mt-0.5">{rec.avg_package}</p>}
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(rec.readiness_score)}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${scoreBg(rec.readiness_score)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-aura-muted">
                      <span>{rec.hiring_growth}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{rec.trend_score}/100</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* ── RIGHT: Detail + Roadmap ── */}
            <div className="xl:col-span-2 space-y-4 min-w-0">
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div
                    key={selected.domain}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Career detail card */}
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold">{selected.domain}</h2>
                          {selected.description && <p className="text-sm text-aura-muted mt-1">{selected.description}</p>}
                        </div>
                        <div className={`text-2xl font-black flex-shrink-0 ${scoreColor(selected.readiness_score)}`}>
                          {scorePercent(selected.readiness_score)}%
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: 'Readiness', value: `${scorePercent(selected.readiness_score)}%`, icon: Target, color: 'text-aura-purple-light' },
                          { label: 'Market Trend', value: `${selected.trend_score}/100`, icon: TrendingUp, color: 'text-cyan-400' },
                          { label: 'Future Proof', value: `${selected.future_proof}%`, icon: Star, color: 'text-yellow-400' },
                          { label: 'Growth', value: selected.hiring_growth, icon: BarChart2, color: 'text-emerald-400' },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-white/5 rounded-xl p-3 text-center">
                            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                            <p className="text-sm font-bold">{stat.value}</p>
                            <p className="text-xs text-aura-muted">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Skills grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        {(selected.matched_skills || []).length > 0 && (
                          <div>
                            <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Your Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selected.matched_skills || []).map((s, i) => (
                                <span key={`m-${i}-${s}`} className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-lg">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selected.missing_skills || []).length > 0 && (
                          <div>
                            <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Skills to Learn
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selected.missing_skills || []).slice(0, 8).map((s, i) => (
                                <span key={`miss-${i}-${s}`} className="px-2 py-0.5 text-xs bg-red-400/10 text-red-400 rounded-lg">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Top companies */}
                      {(selected.top_companies || []).length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-cyan-400" /> Top Hiring Companies
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(selected.top_companies || []).map((c) => (
                              <span key={c} className="px-2.5 py-1 text-xs bg-white/5 text-aura-muted-light rounded-lg border border-white/5">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Emerging tech */}
                      {(selected.emerging_tech || []).length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Emerging Technologies
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(selected.emerging_tech || []).map((t) => (
                              <span key={t} className="px-2.5 py-1 text-xs bg-yellow-400/10 text-yellow-400 rounded-lg">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleRoadmap(selected.domain)}
                        disabled={roadmapLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                      >
                        {roadmapLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating roadmap...</>
                          : <><BookOpen className="w-4 h-4" /> Generate 30-Day Learning Roadmap</>
                        }
                      </button>
                    </div>

                    {/* ── Roadmap Section ── */}
                    {roadmapLoading && (
                      <div className="glass-card p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-aura-purple" />
                        <p className="text-sm text-aura-muted">AI is building your personalized roadmap with resources...</p>
                        <p className="text-xs text-aura-muted mt-1">This may take 15-30 seconds</p>
                      </div>
                    )}

                    {roadmapDays.length > 0 && !roadmapLoading && (
                      <div className="glass-card p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-aura-purple-light" />
                            30-Day Roadmap for {selected.domain}
                          </h3>
                          <span className="text-xs text-aura-muted bg-white/5 px-2.5 py-1 rounded-full">
                            {roadmapDays.length} steps
                          </span>
                        </div>

                        {roadmap?.goal && (
                          <div className="p-3 mb-4 rounded-xl bg-aura-purple/10 border border-aura-purple/20">
                            <p className="text-sm text-aura-muted-light flex items-start gap-2">
                              <Target className="w-4 h-4 text-aura-purple-light flex-shrink-0 mt-0.5" />
                              <span><strong className="text-aura-text">Goal:</strong> {roadmap.goal}</span>
                            </p>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {roadmapDays.map((day, idx) => {
                            const isOpen = expandedDay === (day.day || idx + 1)
                            const dayNum = day.day || idx + 1
                            return (
                              <div key={dayNum} className="border border-white/5 rounded-xl overflow-hidden">
                                <button
                                  onClick={() => setExpandedDay(isOpen ? null : dayNum)}
                                  className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-aura-purple/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-aura-purple-light">{dayNum}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{day.topic}</p>
                                    <p className="text-xs text-aura-muted">{(day.tasks || []).length} tasks</p>
                                  </div>
                                  {isOpen ? <ChevronUp className="w-4 h-4 text-aura-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-aura-muted flex-shrink-0" />}
                                </button>

                                {isOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 pb-4 space-y-3"
                                  >
                                    {/* Tasks */}
                                    {(day.tasks || []).length > 0 && (
                                      <div>
                                        <p className="text-xs text-aura-muted font-semibold uppercase tracking-wide mb-2">Tasks</p>
                                        <ul className="space-y-1.5">
                                          {(day.tasks || []).map((task, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-aura-muted-light">
                                              <ArrowRight className="w-3.5 h-3.5 text-aura-purple mt-0.5 flex-shrink-0" />
                                              {task}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Resources */}
                                    {(day.resources || []).length > 0 && (
                                      <div>
                                        <p className="text-xs text-aura-muted font-semibold uppercase tracking-wide mb-2">Resources</p>
                                        <div className="space-y-1.5">
                                          {(day.resources || []).map((res, i) => {
                                            const isYT = res.type === 'youtube' || (res.url || '').includes('youtube') || (res.url || '').includes('youtu.be')
                                            return (
                                              <a
                                                key={i}
                                                href={res.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm group"
                                              >
                                                {isYT
                                                  ? <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                  : <ExternalLink className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                                }
                                                <span className="text-aura-muted-light group-hover:text-aura-text truncate flex-1">{res.title}</span>
                                                <span className="text-xs text-aura-muted capitalize flex-shrink-0">{res.type}</span>
                                              </a>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Search links */}
                                    <div className="flex gap-2 pt-1">
                                      <a
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(day.topic + ' tutorial')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                      >
                                        <Youtube className="w-3.5 h-3.5" /> YouTube Tutorials
                                      </a>
                                      <a
                                        href={`https://www.google.com/search?q=${encodeURIComponent(day.topic + ' tutorial for beginners')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" /> Google Resources
                                      </a>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Completion badge */}
                        <div className="mt-5 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 flex items-center gap-3">
                          <Award className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-400">Complete all {roadmapDays.length} steps</p>
                            <p className="text-xs text-aura-muted mt-0.5">You'll be job-ready for {selected.domain} in 30 days</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
