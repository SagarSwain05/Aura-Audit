'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, Search, MapPin, Building2, Clock, Star, ChevronRight,
  Zap, Loader2, CheckCircle, Globe, ExternalLink, RefreshCw, AlertCircle,
} from 'lucide-react'
import { jobsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface DBJob {
  _id: string
  title: string
  company?: { name: string; logo?: string; isVerified?: boolean }
  location?: string
  skills: string[]
  minCGPA?: number
  isDrive?: boolean
  status: string
  matchScore?: number
  match_score?: number
  matched_skills?: string[]
  missing_skills?: string[]
  createdAt: string
}

interface LiveJob {
  title: string
  company: string
  location: string
  description: string
  apply_link: string
  salary: string
  job_type: string
  posted_at: string
  match_percentage: number
  match_reason: string
  matched_skills: string[]
  missing_skills: string[]
  source: string
}

type Tab = 'recommended' | 'all' | 'live' | 'applied'

export default function JobsPage() {
  const [jobs, setJobs] = useState<DBJob[]>([])
  const [recommended, setRecommended] = useState<DBJob[]>([])
  const [liveJobs, setLiveJobs] = useState<LiveJob[]>([])
  const [liveQuery, setLiveQuery] = useState('')
  const [liveRole, setLiveRole] = useState('')
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveFetched, setLiveFetched] = useState(false)
  const [tab, setTab] = useState<Tab>('recommended')
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('India')
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      jobsApi.getJobs(),
      jobsApi.getRecommended(),
      jobsApi.getMyApplications(),
    ]).then(([allRes, recRes, appsRes]) => {
      if (allRes.status === 'fulfilled') {
        setJobs(allRes.value.data.jobs || [])
      }
      if (recRes.status === 'fulfilled') {
        setRecommended(recRes.value.data.jobs || recRes.value.data.recommendations || [])
      }
      if (appsRes.status === 'fulfilled') {
        const appIds = new Set<string>(
          (appsRes.value.data.applications || []).map((a: { job: { _id: string } | string }) =>
            typeof a.job === 'string' ? a.job : a.job?._id
          )
        )
        setApplied(appIds)
      }
    }).finally(() => setLoading(false))
  }, [])

  const fetchLiveJobs = async () => {
    setLiveLoading(true)
    setLiveFetched(true)
    try {
      const r = await jobsApi.getLiveJobs({ location: location || 'India', num_jobs: 12, role: liveRole || undefined })
      setLiveJobs(r.data.jobs || [])
      setLiveQuery(r.data.query || '')
      if ((r.data.jobs || []).length === 0) {
        toast('No live results found. Try a different location.', { icon: 'ℹ️' })
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Live search failed')
    } finally {
      setLiveLoading(false)
    }
  }

  const handleApply = async (jobId: string) => {
    setApplying(jobId)
    try {
      await jobsApi.applyJob(jobId)
      setApplied((prev) => new Set([...prev, jobId]))
      toast.success('Application submitted!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(null)
    }
  }

  const matchScore = (job: DBJob) => {
    const s = job.match_score ?? job.matchScore ?? 0
    return s <= 1 ? Math.round(s * 100) : Math.round(s)
  }

  const displayJobs =
    tab === 'recommended' ? recommended
    : tab === 'applied' ? jobs.filter((j) => applied.has(j._id))
    : jobs

  const filtered = displayJobs.filter((j) =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.name.toLowerCase().includes(search.toLowerCase())
  )

  const scoreColor = (s: number) =>
    s >= 70 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-aura-purple-light'

  const liveScoreColor = (s: number) =>
    s >= 70 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'

  const TAB_ITEMS: { id: Tab; label: string; badge?: string }[] = [
    { id: 'recommended', label: 'AI Matched' },
    { id: 'all', label: 'All Jobs' },
    { id: 'live', label: 'Live Jobs', badge: 'NEW' },
    { id: 'applied', label: 'Applied' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="text-aura-muted text-sm mt-1">
          AI-matched internal jobs + real-time Google Jobs via SerpApi
        </p>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {tab !== 'live' && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies..."
              className="input-field pl-9 w-full"
            />
          </div>
        )}
        <div className="glass-card p-1 flex gap-1">
          {TAB_ITEMS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-aura-gradient text-white' : 'text-aura-muted hover:text-aura-text'
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="absolute -top-1 -right-1 text-[9px] px-1 py-0 bg-emerald-400 text-black rounded-full font-bold leading-4">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIVE JOBS TAB ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Location + trigger */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h2 className="font-semibold text-sm">Real-Time Job Search</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Powered by Google Jobs + Gemini</span>
              </div>
              <p className="text-xs text-aura-muted mb-4">
                Searches live Google Jobs right now based on your skills & dream role. AI scores each match instantly.
              </p>
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
                  <input
                    type="text"
                    value={liveRole}
                    onChange={(e) => setLiveRole(e.target.value)}
                    placeholder="Job Role (e.g. Software Engineer)"
                    className="input-field pl-9 text-sm"
                  />
                </div>
                <div className="relative flex-1 min-w-40">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location (e.g. Bangalore, India)"
                    className="input-field pl-9 text-sm"
                  />
                </div>
                <button
                  onClick={fetchLiveJobs}
                  disabled={liveLoading}
                  className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
                >
                  {liveLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {liveLoading ? 'Searching...' : liveFetched ? 'Refresh' : 'Search Live Jobs'}
                </button>
              </div>
              {liveQuery && (
                <p className="text-xs text-aura-muted mt-3">
                  Search query: <span className="text-aura-purple-light font-medium">"{liveQuery}"</span>
                  {liveJobs.length > 0 && <span> · {liveJobs.length} jobs found</span>}
                </p>
              )}
            </div>

            {liveLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded w-48" />
                        <div className="h-3 bg-white/5 rounded w-32" />
                        <div className="h-3 bg-white/5 rounded w-full" />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-aura-muted mt-2">
                  Fetching live jobs + Gemini AI scoring… this takes ~15-30s
                </p>
              </div>
            ) : liveFetched && liveJobs.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-yellow-400 opacity-60" />
                <p className="text-aura-muted mb-1">No live jobs found</p>
                <p className="text-xs text-aura-muted">Try a different location or add more skills to your profile</p>
              </div>
            ) : !liveFetched ? (
              <div className="glass-card p-12 text-center border-dashed">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-aura-muted text-sm mb-1">Click "Search Live Jobs" to fetch real-time results</p>
                <p className="text-xs text-aura-muted">Results come directly from Google Jobs, scored by Gemini AI</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveJobs.map((job, i) => (
                  <motion.div
                    key={`${job.title}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Company icon */}
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                        <Building2 className="w-6 h-6 text-aura-muted" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-semibold">{job.title}</h3>
                            <p className="text-sm text-aura-muted mt-0.5">{job.company}</p>
                          </div>
                          {/* Match score */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-sm font-bold ${liveScoreColor(job.match_percentage)}`}>
                              <Zap className="w-3.5 h-3.5" />
                              {job.match_percentage}% match
                            </div>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-aura-muted">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {job.location}
                            </span>
                          )}
                          {job.job_type && (
                            <span className="px-2 py-0.5 rounded-full bg-white/5">{job.job_type}</span>
                          )}
                          {job.salary && (
                            <span className="text-emerald-400 font-semibold">{job.salary}</span>
                          )}
                          {job.posted_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {job.posted_at}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-emerald-400/70">
                            <Globe className="w-3 h-3" /> Live
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-aura-muted mt-2 line-clamp-2">{job.description}</p>

                        {/* AI match reason */}
                        {job.match_reason && job.match_reason !== 'N/A' && (
                          <p className="text-xs mt-1.5 text-aura-muted-light italic">
                            💡 {job.match_reason}
                          </p>
                        )}

                        {/* Skill tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {job.matched_skills?.slice(0, 5).map((s) => (
                            <span key={s} className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-lg">
                              ✓ {s}
                            </span>
                          ))}
                          {job.missing_skills?.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 text-xs bg-red-400/10 text-red-400 rounded-lg">
                              ✗ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Apply button */}
                      {job.apply_link ? (
                        <a
                          href={job.apply_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
                        >
                          Apply <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-aura-muted px-3 py-2 border border-white/5 rounded-xl flex-shrink-0">
                          No link
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── DB JOBS TABS ─────────────────────────────────────── */}
        {tab !== 'live' && (
          <motion.div
            key="db"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {loading ? (
              <>{[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-aura-muted mb-3">
                  {tab === 'recommended'
                    ? 'Complete your profile & add skills to get AI job recommendations'
                    : tab === 'applied'
                    ? 'No applications yet'
                    : 'No platform jobs yet'}
                </p>
                {(tab === 'all' || tab === 'recommended') && (
                  <button
                    onClick={() => setTab('live')}
                    className="btn-primary text-sm px-5 py-2 flex items-center gap-2 mx-auto"
                  >
                    <Globe className="w-4 h-4" /> Try Live Jobs
                  </button>
                )}
              </div>
            ) : (
              filtered.map((job, i) => {
                const ms = matchScore(job)
                return (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="glass-card p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-aura-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{job.title}</h3>
                              {job.company?.isVerified && (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </div>
                            <p className="text-sm text-aura-muted">{job.company?.name || 'Company'}</p>
                          </div>
                          {ms > 0 && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-sm font-bold flex-shrink-0 ${scoreColor(ms)}`}>
                              <Zap className="w-3.5 h-3.5" />
                              {ms}% match
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-aura-muted">
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                          {job.minCGPA && <span className="flex items-center gap-1"><Star className="w-3 h-3" />CGPA {job.minCGPA}+</span>}
                          {job.isDrive && <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">Campus Drive</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        {job.matched_skills && job.matched_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.matched_skills.slice(0, 5).map((s) => (
                              <span key={s} className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-lg">✓ {s}</span>
                            ))}
                            {job.missing_skills?.slice(0, 3).map((s) => (
                              <span key={s} className="px-2 py-0.5 text-xs bg-red-400/10 text-red-400 rounded-lg">✗ {s}</span>
                            ))}
                          </div>
                        )}
                        {!job.matched_skills?.length && job.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.skills.slice(0, 6).map((s) => (
                              <span key={s} className="px-2 py-0.5 text-xs bg-white/5 text-aura-muted rounded-lg">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {applied.has(job._id) ? (
                          <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium px-3 py-2 bg-emerald-400/10 rounded-xl">
                            <CheckCircle className="w-4 h-4" /> Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApply(job._id)}
                            disabled={applying === job._id}
                            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                          >
                            {applying === job._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
