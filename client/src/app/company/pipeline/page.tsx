'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, ChevronDown, Loader2, User, Sparkles, Plus, Check, Star, Filter } from 'lucide-react'
import { jobsApi, companyApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Application {
  _id: string
  student: { _id: string; name: string; email: string }
  job: { _id: string; title: string }
  status: string
  matchScore?: number
  createdAt: string
}

interface Suggested {
  _id: string
  name: string
  department?: string
  cgpa?: number
  careerReadinessScore?: number
  matchScore: number
  readiness?: 'excellent' | 'good' | 'fair' | 'needs_growth'
  skills: { name: string; level: string }[]
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

const READINESS_COLORS: Record<string, string> = {
  excellent: 'text-emerald-400 bg-emerald-400/10',
  good: 'text-cyan-400 bg-cyan-400/10',
  fair: 'text-yellow-400 bg-yellow-400/10',
  needs_growth: 'text-red-400 bg-red-400/10',
}

export default function PipelinePage() {
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const [suggested, setSuggested] = useState<Suggested[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [minScore, setMinScore] = useState('30')
  const [minCgpa, setMinCgpa] = useState('')
  const [sourcing, setSourcing] = useState<string | null>(null)
  const [showSuggested, setShowSuggested] = useState(true)

  useEffect(() => {
    companyApi.getMyJobs().then((r) => {
      const j = r.data.jobs || []
      setJobs(j)
      if (j.length > 0) setSelectedJob(j[0]._id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedJob) return
    setLoading(true)
    jobsApi.getApplications(selectedJob).then((r) => {
      setApplications(r.data.applications || [])
    }).finally(() => setLoading(false))
  }, [selectedJob])

  const loadSuggested = () => {
    if (!selectedJob) return
    setSuggestLoading(true)
    companyApi.matchCandidates(selectedJob, { minScore: Number(minScore) || 0, limit: 30 })
      .then((r) => setSuggested(r.data.matches || []))
      .catch(() => setSuggested([]))
      .finally(() => setSuggestLoading(false))
  }
  useEffect(() => { loadSuggested() }, [selectedJob]) // eslint-disable-line

  const pipelineStudentIds = useMemo(() => new Set(applications.map((a) => a.student?._id)), [applications])
  const visibleSuggested = useMemo(
    () => suggested.filter((s) => !minCgpa || (s.cgpa || 0) >= Number(minCgpa)),
    [suggested, minCgpa]
  )

  const handleSource = async (studentId: string) => {
    setSourcing(studentId)
    try {
      await companyApi.sourceCandidate(selectedJob, studentId)
      toast.success('Added to pipeline')
      const r = await jobsApi.getApplications(selectedJob)
      setApplications(r.data.applications || [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to add')
    } finally {
      setSourcing(null)
    }
  }

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

  const selectedJobTitle = jobs.find((j) => j._id === selectedJob)?.title

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hiring Pipeline</h1>
          <p className="text-aura-muted text-sm mt-1">Applications plus AI-sourced candidates from the whole student portal</p>
        </div>
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

      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">Post a job first to build a pipeline for it.</p>
        </div>
      ) : (
        <>
          {/* AI-suggested candidates from the whole portal */}
          <div className="glass-card p-5">
            <button
              onClick={() => setShowSuggested(!showSuggested)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-aura-purple-light" />
                <h2 className="font-semibold text-sm">AI-Suggested Candidates{selectedJobTitle ? ` for ${selectedJobTitle}` : ''}</h2>
                <span className="text-xs text-aura-muted bg-white/5 px-2 py-0.5 rounded-full">{visibleSuggested.length}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-aura-muted transition-transform ${showSuggested ? 'rotate-180' : ''}`} />
            </button>

            {showSuggested && (
              <div className="mt-4">
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Min match score</label>
                    <select value={minScore} onChange={(e) => setMinScore(e.target.value)} className="input-field text-sm py-1.5">
                      {['0', '30', '50', '70', '85'].map((v) => <option key={v} value={v}>{v}%+</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Min CGPA</label>
                    <input type="number" min="0" max="10" step="0.1" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="e.g. 7.0" className="input-field text-sm py-1.5 w-24" />
                  </div>
                  <button onClick={loadSuggested} disabled={suggestLoading} className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5">
                    {suggestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                    Apply Filters
                  </button>
                </div>

                {suggestLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                  </div>
                ) : visibleSuggested.length === 0 ? (
                  <p className="text-sm text-aura-muted py-6 text-center">No matching candidates at this filter level — try lowering the min score.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {visibleSuggested.map((s) => {
                      const inPipeline = pipelineStudentIds.has(s._id)
                      return (
                        <div key={s._id} className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{s.name}</p>
                              <p className="text-xs text-aura-muted">{s.department}</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-aura-purple/10 text-aura-purple-light text-xs font-bold shrink-0">
                              {Math.round(s.matchScore)}%
                            </div>
                          </div>
                          {s.readiness && (
                            <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${READINESS_COLORS[s.readiness]}`}>
                              {s.readiness.replace('_', ' ')}
                            </span>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-aura-muted">
                              {s.cgpa != null && <span className="flex items-center gap-1"><Star className="w-3 h-3" />{s.cgpa}</span>}
                            </div>
                            <button
                              onClick={() => handleSource(s._id)}
                              disabled={inPipeline || sourcing === s._id}
                              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors ${
                                inPipeline ? 'bg-emerald-400/10 text-emerald-400' : 'bg-aura-purple/10 text-aura-purple-light hover:bg-aura-purple/20'
                              }`}
                            >
                              {sourcing === s._id ? <Loader2 className="w-3 h-3 animate-spin" /> : inPipeline ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {inPipeline ? 'In Pipeline' : 'Add to Pipeline'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kanban board of actual applications */}
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-aura-muted">No applications yet — add candidates above to start the pipeline.</p>
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
                                <p className="text-xs text-aura-purple-light">{Math.round(app.matchScore <= 1 ? app.matchScore * 100 : app.matchScore)}% match</p>
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
        </>
      )}
    </div>
  )
}
