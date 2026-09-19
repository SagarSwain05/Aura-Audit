'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Building2, AlertTriangle, GraduationCap, ChevronRight, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Dashboard {
  university: { name: string; totalStudents: number; avgAuraScore: number }
  stats: { totalStudents: number; placedStudents: number; avgScore: number; atRiskCount: number; pendingCompanies: number }
  topSkillGaps: string[]
  departmentStats: { department: string; count: number; avgScore: number; placed: number }[]
  recentPlacements: { name: string; company: string; role: string; package: number }[]
}

interface InsightAction {
  priority: 'high' | 'medium' | 'low'
  action: string
  reason: string
}

interface Insights {
  summary: string
  actions: InsightAction[]
  generatedAt?: string
  cached?: boolean
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-400/10 text-red-400 border-red-400/20',
  medium: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  low: 'bg-white/5 text-aura-muted border-white/10',
}

export default function TPOHome() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    universityApi.getDashboard().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
    universityApi.getInsights().then((r) => setInsights(r.data)).catch(() => {}).finally(() => setInsightsLoading(false))
  }, [])

  const regenerateInsights = async () => {
    setRegenerating(true)
    try {
      const r = await universityApi.getInsights(true)
      setInsights(r.data)
      toast.success('Insights refreshed')
    } catch {
      toast.error('AI engine unavailable — try again shortly')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  const stats = data?.stats
  const placementRate = stats?.totalStudents ? Math.round((stats.placedStudents / stats.totalStudents) * 100) : 0

  const summaryStats = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
    { label: 'Placed', value: stats?.placedStudents || 0, icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'At Risk', value: stats?.atRiskCount || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Pending KYC', value: stats?.pendingCompanies || 0, icon: Building2, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data?.university?.name || 'University Dashboard'}</h1>
          <p className="text-aura-muted text-sm mt-1">Placement & employability overview</p>
        </div>
        <Link href="/tpo/upload" className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Users className="w-4 h-4" /> Upload Students
        </Link>
      </div>

      {/* AI Cohort Insights */}
      <div className="glass-card p-5 border-aura-purple/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-aura-purple-light" /> AI Cohort Insights
          </h2>
          <button
            onClick={regenerateInsights}
            disabled={regenerating || insightsLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-aura-muted hover:bg-white/10 flex items-center gap-1.5 disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
        {insightsLoading ? (
          <div className="h-16 flex items-center text-aura-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing your cohort...
          </div>
        ) : !insights ? (
          <p className="text-sm text-aura-muted">AI insights unavailable right now — try refreshing.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-aura-muted-light">{insights.summary}</p>
            {insights.actions?.length > 0 && (
              <div className="space-y-2">
                {insights.actions.map((a, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs ${PRIORITY_COLOR[a.priority] || PRIORITY_COLOR.low}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium flex-1">{a.action}</p>
                      <span className="uppercase text-[9px] font-bold tracking-wide shrink-0">{a.priority}</span>
                    </div>
                    {a.reason && <p className="opacity-80 mt-1">{a.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placement ring */}
        <div className="glass-card p-6 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-aura-muted mb-4 self-start">Placement Rate</h2>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - placementRate / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-emerald-400">{placementRate}%</span>
              <span className="text-xs text-aura-muted">placed</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-aura-muted">Avg Score: <span className="font-bold text-aura-text">{stats?.avgScore || 0}</span></p>
          </div>
        </div>

        {/* Department chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-semibold text-aura-muted mb-4">Dept-wise Readiness</h2>
          {(data?.departmentStats?.length || 0) === 0 ? (
            <div className="h-40 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.departmentStats?.map((d) => ({ name: d.department, score: Math.round(d.avgScore) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Bar dataKey="score" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top skill gaps */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Top Skill Gaps</h2>
            <Link href="/tpo/intervention" className="text-xs text-aura-purple-light hover:underline flex items-center gap-1">
              Intervention <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.topSkillGaps || []).length === 0 ? (
              <p className="text-sm text-aura-muted">No data yet</p>
            ) : (
              (data?.topSkillGaps || []).map((skill, i) => (
                <span key={i} className="px-3 py-1.5 text-sm rounded-xl bg-red-400/10 text-red-400 border border-red-400/20">{skill}</span>
              ))
            )}
          </div>
        </div>

        {/* Recent placements */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Recent Placements</h2>
            <Link href="/tpo/placements" className="text-xs text-aura-purple-light hover:underline">View all</Link>
          </div>
          {(data?.recentPlacements?.length || 0) === 0 ? (
            <p className="text-sm text-aura-muted">No placements recorded yet</p>
          ) : (
            <div className="space-y-2">
              {data?.recentPlacements?.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-aura-muted">{p.role} @ {p.company}</p>
                  </div>
                  {p.package && <span className="text-xs text-emerald-400 font-semibold">{p.package} LPA</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
