'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { PieChart as PieIcon, TrendingUp, Users, Star } from 'lucide-react'
import { universityApi } from '@/lib/api'

interface Metrics {
  overall: { avgScore: number; placementRate: number; avgCGPA: number; totalStudents: number }
  byDepartment: { department: string; avgScore: number; placementRate: number; count: number; avgCGPA: number }[]
  skillDistribution: { skill: string; count: number; percentage: number }[]
  scoreDistribution: { range: string; count: number }[]
  yearWise: { year: number; avgScore: number; placed: number; total: number }[]
}

const COLORS = ['#7C3AED', '#06B6D4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function EmployabilityPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    universityApi.getEmployabilityMetrics().then((r) => setMetrics(r.data.metrics || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
    </div>
  )

  const overall = metrics?.overall
  const deptData = metrics?.byDepartment || []
  const scoreDistData = metrics?.scoreDistribution || []
  const skillData = metrics?.skillDistribution?.slice(0, 8) || []
  const yearData = metrics?.yearWise || []

  const summaryItems = [
    { label: 'Avg Readiness Score', value: `${overall?.avgScore || 0}%`, icon: Star, color: 'text-aura-purple-light' },
    { label: 'Placement Rate', value: `${overall?.placementRate || 0}%`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Avg CGPA', value: overall?.avgCGPA?.toFixed(2) || '—', icon: Star, color: 'text-yellow-400' },
    { label: 'Total Students', value: overall?.totalStudents || 0, icon: Users, color: 'text-cyan-400' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Employability Metrics</h1>
        <p className="text-aura-muted text-sm mt-1">Comprehensive view of student career readiness</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryItems.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dept-wise avg score */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Department-wise Avg Readiness</h2>
          {deptData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData.map((d) => ({ name: d.department, score: Math.round(d.avgScore), placed: Math.round(d.placementRate) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Bar dataKey="score" fill="#7C3AED" radius={[4,4,0,0]} name="Readiness" />
                <Bar dataKey="placed" fill="#10b981" radius={[4,4,0,0]} name="Placement %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score distribution */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Score Distribution</h2>
          {scoreDistData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={scoreDistData} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="range" label={({ range, count }) => `${range}: ${count}`} labelLine={false}>
                  {scoreDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top skills */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Top Skills Across Students</h2>
          {skillData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No skill data</div>
          ) : (
            <div className="space-y-3">
              {skillData.map((s) => (
                <div key={s.skill}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-aura-muted-light">{s.skill}</span>
                    <span className="font-semibold">{s.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-aura-gradient rounded-full" style={{ width: `${s.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Year-wise */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Year-wise Overview</h2>
          {yearData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <div className="space-y-3">
              {yearData.map((y) => (
                <div key={y.year} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-aura-purple/20 flex items-center justify-center text-aura-purple-light font-bold flex-shrink-0">
                    Y{y.year}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-aura-muted">{y.total} students</span>
                      <span className="font-semibold">{Math.round(y.avgScore)}% avg</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-aura-gradient rounded-full" style={{ width: `${y.avgScore}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">
                    {y.placed}/{y.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
