'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Users, TrendingUp, Building2, Plus, ChevronRight, UserCheck } from 'lucide-react'
import { companyApi, jobsApi } from '@/lib/api'
import Link from 'next/link'

interface Dashboard {
  company: { name: string; isVerified: boolean; plan: string; stats: { totalHired: number; activeJobs: number; totalApplications: number } }
  recentApplications: { _id: string; student: { name: string }; job: { title: string }; status: string; createdAt: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  applied: 'text-cyan-400 bg-cyan-400/10',
  shortlisted: 'text-yellow-400 bg-yellow-400/10',
  interview_scheduled: 'text-aura-purple-light bg-aura-purple/10',
  selected: 'text-emerald-400 bg-emerald-400/10',
  rejected: 'text-red-400 bg-red-400/10',
  on_hold: 'text-gray-400 bg-gray-400/10',
}

export default function CompanyHome() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companyApi.getDashboard().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  const company = data?.company
  const stats = [
    { label: 'Active Jobs', value: company?.stats?.activeJobs || 0, icon: Briefcase, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
    { label: 'Total Applications', value: company?.stats?.totalApplications || 0, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Total Hired', value: company?.stats?.totalHired || 0, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Plan', value: company?.plan?.toUpperCase() || 'FREE', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{company?.name || 'Company Dashboard'}</h1>
            {company?.isVerified ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">Verified</span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">KYC Pending</span>
            )}
          </div>
          <p className="text-aura-muted text-sm mt-1">Manage your hiring pipeline and discover top talent</p>
        </div>
        <Link href="/company/jobs" className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Post Job
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-aura-muted mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/company/candidates', label: 'Search Candidates', icon: Users, desc: 'Find talent by skills' },
              { href: '/company/ai-match', label: 'AI Candidate Matching', icon: TrendingUp, desc: 'Smart recommendations' },
              { href: '/company/pipeline', label: 'View Hiring Pipeline', icon: Briefcase, desc: 'Track applications' },
              { href: '/company/kyc', label: 'Complete KYC', icon: UserCheck, desc: 'Get verified badge' },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-aura-muted group-hover:text-aura-purple-light transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-aura-muted">{a.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-aura-muted" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent applications */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aura-muted">Recent Applications</h2>
            <Link href="/company/pipeline" className="text-xs text-aura-purple-light hover:underline">View all</Link>
          </div>
          {(data?.recentApplications?.length || 0) === 0 ? (
            <div className="text-center py-8 text-aura-muted text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No applications yet. Post a job to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {data?.recentApplications?.slice(0, 5).map((app) => (
                <div key={app._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {app.student?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.student?.name}</p>
                    <p className="text-xs text-aura-muted truncate">{app.job?.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[app.status] || ''}`}>
                    {app.status?.replace('_', ' ')}
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
