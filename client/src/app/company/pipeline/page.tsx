'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, ChevronDown, Loader2, User } from 'lucide-react'
import { jobsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Application {
  _id: string
  student: { _id: string; name: string; email: string }
  job: { _id: string; title: string }
  status: string
  matchScore?: number
  createdAt: string
}

const STATUSES = ['applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected', 'on_hold']

const STATUS_COLORS: Record<string, string> = {
  applied: 'text-cyan-400',
  shortlisted: 'text-yellow-400',
  interview_scheduled: 'text-aura-purple-light',
  selected: 'text-emerald-400',
  rejected: 'text-red-400',
  on_hold: 'text-gray-400',
}

export default function PipelinePage() {
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    jobsApi.getJobs().then((r) => {
      const j = r.data.jobs || []
      setJobs(j)
      if (j.length > 0) {
        setSelectedJob(j[0]._id)
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedJob) return
    setLoading(true)
    jobsApi.getApplications(selectedJob).then((r) => {
      setApplications(r.data.applications || [])
    }).finally(() => setLoading(false))
  }, [selectedJob])

  const handleStatusChange = async (jobId: string, appId: string, status: string) => {
    setUpdating(appId)
    try {
      await jobsApi.updateApplicationStatus(jobId, appId, { status })
      setApplications((prev) => prev.map((a) => a._id === appId ? { ...a, status } : a))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s)
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Hiring Pipeline</h1>
        {jobs.length > 0 && (
          <div className="relative">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="input-field pr-8 appearance-none min-w-48"
            >
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No applications for this job yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map((status) => (
              <div key={status} className="w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider capitalize ${STATUS_COLORS[status]}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-aura-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {grouped[status]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {(grouped[status] || []).map((app) => (
                    <motion.div
                      key={app._id}
                      layout
                      className="glass-card p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-aura-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {app.student?.name?.charAt(0) || <User className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{app.student?.name}</p>
                          {app.matchScore != null && (
                            <p className="text-xs text-aura-purple-light">{Math.round(app.matchScore * 100)}% match</p>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(selectedJob, app._id, e.target.value)}
                          disabled={updating === app._id}
                          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-aura-text appearance-none pr-6 focus:outline-none focus:border-aura-purple"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-aura-card capitalize">{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                        {updating === app._id ? (
                          <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-aura-muted" />
                        ) : (
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-aura-muted pointer-events-none" />
                        )}
                      </div>
                    </motion.div>
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
