'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp, Brain, Briefcase, Trophy, Upload, ArrowRight, Star,
  Activity, Target, Award, ChevronRight, Zap,
} from 'lucide-react'
import { studentApi, auditApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'

interface DashboardData {
  student: {
    name: string
    careerReadinessScore: number
    careerPoints: { total: number }
    rank: { overall: number; branch: number }
    skills: { name: string; level: string }[]
    badges: { type: string; name: string }[]
    activityStats: {
      jobsApplied: number
      certificationsEarned: number
      interviewsAttended: number
      coursesCompleted: number
    }
    dreamRole: string
    cgpa: number
  }
  recentAudits: { _id: string; dreamRole: string; auraScore: { overall: number }; createdAt: string }[]
  upcomingAssessments: { _id: string; skill: string; status: string }[]
}

const SCORE_COLOR = (s: number) =>
  s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'

const SCORE_BG = (s: number) =>
  s >= 75 ? 'bg-emerald-400/20' : s >= 50 ? 'bg-yellow-400/20' : 'bg-red-400/20'

const BADGE_COLORS: Record<string, string> = {
  platinum: 'text-cyan-300',
  gold: 'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-orange-400',
}

export default function StudentHome() {
  const { user } = useAuditStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      studentApi.getDashboard(),
      auditApi.getAll(),
    ]).then(([dashRes, auditsRes]) => {
      setData({
        student: dashRes.data.student,
        recentAudits: auditsRes.data.audits?.slice(0, 3) || [],
        upcomingAssessments: dashRes.data.upcomingAssessments || [],
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />

  const student = data?.student
  const score = student?.careerReadinessScore || 0
  const circumference = 2 * Math.PI * 52

  const quickActions = [
    { label: 'Upload Resume', href: '/upload', icon: Upload, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
    { label: 'Take Assessment', href: '/student/assessments', icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Browse Jobs', href: '/student/jobs', icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Career Match', href: '/student/career', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ]

  const stats = [
    { label: 'Career Points', value: student?.careerPoints?.total || 0, icon: Star, color: 'text-yellow-400' },
    { label: 'Global Rank', value: student?.rank?.overall ? `#${student.rank.overall}` : 'N/A', icon: Trophy, color: 'text-cyan-400' },
    { label: 'Skills', value: student?.skills?.length || 0, icon: Activity, color: 'text-emerald-400' },
    { label: 'Jobs Applied', value: student?.activityStats?.jobsApplied || 0, icon: Target, color: 'text-aura-purple-light' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-aura-muted mt-1 text-sm">
            {student?.dreamRole ? `Working towards: ${student.dreamRole}` : 'Set your dream role to get personalized recommendations'}
          </p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Upload className="w-4 h-4" /> Audit Resume
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career Readiness Score */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-aura-muted mb-4 self-start">Career Readiness</h2>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--c-bord))" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={score >= 75 ? '#10b981' : score >= 50 ? '#facc15' : '#f87171'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - score / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${SCORE_COLOR(score)}`}>{score}</span>
              <span className="text-xs text-aura-muted">/ 100</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center">
            <div>
              <p className="text-sm font-bold">{student?.cgpa || '—'}</p>
              <p className="text-xs text-aura-muted">CGPA</p>
            </div>
            <div>
              <p className="text-sm font-bold">{student?.skills?.length || 0}</p>
              <p className="text-xs text-aura-muted">Skills</p>
            </div>
            <div>
              <p className="text-sm font-bold">{student?.activityStats?.certificationsEarned || 0}</p>
              <p className="text-xs text-aura-muted">Certs</p>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <h2 className="text-sm font-semibold text-aura-muted mb-4">Activity Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-aura-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Badges</h2>
            <Link href="/student/leaderboard" className="text-xs text-aura-purple-light hover:underline flex items-center gap-1">
              Leaderboard <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {(student?.badges?.length || 0) === 0 ? (
            <div className="text-center py-6 text-aura-muted text-sm">
              <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Complete assessments to earn badges
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {student?.badges?.map((b, i) => (
                <div key={i} className={`px-3 py-1.5 rounded-xl bg-white/5 text-xs font-semibold ${BADGE_COLORS[b.type] || 'text-aura-text'}`}>
                  {b.name}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-sm font-semibold text-aura-muted mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-white/10 transition-all group text-center">
              <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <a.icon className={`w-5 h-5 ${a.color}`} />
              </div>
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Recent Audits</h2>
            <Link href="/dashboard" className="text-xs text-aura-purple-light hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(data?.recentAudits?.length || 0) === 0 ? (
            <div className="text-center py-6 text-aura-muted text-sm">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No audits yet.</p>
              <Link href="/upload" className="text-aura-purple-light hover:underline mt-1 inline-block">Upload your resume</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentAudits?.map((a) => (
                <Link key={a._id} href={`/audit/${a._id}`} className="flex items-center justify-between hover:bg-white/5 p-2 rounded-xl transition-colors">
                  <div>
                    <p className="text-sm font-medium">{a.dreamRole || 'General Audit'}</p>
                    <p className="text-xs text-aura-muted">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  {a.auraScore?.overall != null && (
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg ${SCORE_BG(a.auraScore.overall)} ${SCORE_COLOR(a.auraScore.overall)}`}>
                      {a.auraScore.overall}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Skills preview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Top Skills</h2>
            <Link href="/student/skills" className="text-xs text-aura-purple-light hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(student?.skills?.length || 0) === 0 ? (
            <div className="text-center py-6 text-aura-muted text-sm">
              Add your skills to improve your career readiness score
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {student?.skills?.slice(0, 12).map((sk, i) => {
                const colors: Record<string, string> = {
                  expert: 'bg-aura-purple/20 text-aura-purple-light border-aura-purple/30',
                  advanced: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
                  intermediate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
                  beginner: 'bg-white/5 text-aura-muted border-white/5',
                }
                return (
                  <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${colors[sk.level] || colors.beginner}`}>
                    {sk.name}
                  </span>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div className="skeleton h-8 w-64 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  )
}
