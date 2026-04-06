'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { TrendingUp, Activity, Target, Award } from 'lucide-react'
import { studentApi, auditApi } from '@/lib/api'

interface StudentData {
  careerReadinessScore: number
  careerPoints: { total: number; history: { points: number; reason: string; timestamp: string }[] }
  activityStats: {
    coursesCompleted: number
    interviewsAttended: number
    certificationsEarned: number
    jobsApplied: number
    alumniConnections: number
    loginStreak: number
  }
  skills: { name: string; level: string }[]
}

const LEVEL_SCORES: Record<string, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 }

export default function AnalyticsPage() {
  const [student, setStudent] = useState<StudentData | null>(null)
  const [audits, setAudits] = useState<{ auraScore?: { overall: number }; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      studentApi.getProfile(),
      auditApi.getAll(),
    ]).then(([sRes, aRes]) => {
      setStudent(sRes.data.student)
      setAudits(aRes.data.audits || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
    </div>
  )

  if (!student) return null

  // Radar data from skills
  const radarData = (student.skills || []).slice(0, 8).map((s) => ({
    subject: s.name.slice(0, 10),
    A: LEVEL_SCORES[s.level] || 25,
  }))

  // Score trend from audits
  const scoreTrend = audits
    .filter((a) => a.auraScore?.overall != null)
    .map((a) => ({
      date: new Date(a.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      score: a.auraScore!.overall,
    }))
    .slice(-10)

  // Points timeline
  const pointsHistory = (student.careerPoints?.history || []).slice(-10).map((h, i) => ({
    name: `#${i + 1}`,
    points: h.points,
    reason: h.reason,
  }))

  const activityItems = [
    { label: 'Jobs Applied', value: student.activityStats?.jobsApplied || 0, max: 20 },
    { label: 'Courses Done', value: student.activityStats?.coursesCompleted || 0, max: 10 },
    { label: 'Interviews', value: student.activityStats?.interviewsAttended || 0, max: 10 },
    { label: 'Certifications', value: student.activityStats?.certificationsEarned || 0, max: 5 },
    { label: 'Connections', value: student.activityStats?.alumniConnections || 0, max: 20 },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-aura-muted text-sm mt-1">Track your career growth over time</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Career Readiness', value: `${student.careerReadinessScore}%`, icon: Target, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
          { label: 'Career Points', value: student.careerPoints?.total || 0, icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Total Audits', value: audits.length, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Login Streak', value: `${student.activityStats?.loginStreak || 0}d`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Radar */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Skill Radar</h2>
          {radarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">Add skills to see radar</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Radar name="Skills" dataKey="A" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Audit Score Trend */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Aura Score Trend</h2>
          {scoreTrend.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">Run more audits to see trend</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Career Points history */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Career Points History</h2>
          {pointsHistory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No points yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pointsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Bar dataKey="points" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Activity Breakdown</h2>
          <div className="space-y-4">
            {activityItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-aura-muted">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-aura-gradient rounded-full"
                    style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
