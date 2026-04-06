'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Zap, Users, ChevronDown, Star, Loader2 } from 'lucide-react'
import { jobsApi, companyApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Match {
  _id: string
  name: string
  email: string
  careerReadinessScore?: number
  skills: { name: string; level: string }[]
  cgpa?: number
  matchScore?: number
  department?: string
}

export default function AIMatchPage() {
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    jobsApi.getJobs({ status: 'active' }).then((r) => {
      setJobs(r.data.jobs || [])
    }).finally(() => setFetching(false))
  }, [])

  const handleMatch = async () => {
    if (!selectedJob) return toast.error('Select a job first')
    setLoading(true)
    try {
      const r = await companyApi.matchCandidates(selectedJob)
      setMatches(r.data.candidates || r.data.matches || [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to match')
    } finally {
      setLoading(false)
    }
  }

  const LEVEL_COLORS: Record<string, string> = {
    expert: 'bg-aura-purple/20 text-aura-purple-light',
    advanced: 'bg-cyan-400/10 text-cyan-400',
    intermediate: 'bg-emerald-400/10 text-emerald-400',
    beginner: 'bg-white/5 text-aura-muted',
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">AI Candidate Matching</h1>
        <p className="text-aura-muted text-sm mt-1">Select a job to find the best-fit candidates automatically</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-3">Select Job Posting</h2>
        {fetching ? (
          <div className="skeleton h-10 rounded-xl" />
        ) : jobs.length === 0 ? (
          <p className="text-sm text-aura-muted">No active jobs. Post a job first.</p>
        ) : (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input-field pr-8 appearance-none w-full">
                <option value="">Choose a job...</option>
                {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted pointer-events-none" />
            </div>
            <button onClick={handleMatch} disabled={loading || !selectedJob} className="btn-primary flex items-center gap-2 px-6 text-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Find Matches
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : matches.length > 0 ? (
        <>
          <p className="text-sm text-aura-muted">{matches.length} candidates ranked by AI match score</p>
          <div className="space-y-3">
            {matches.map((m, i) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center text-white font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold">{m.name}</h3>
                      {m.department && <p className="text-xs text-aura-muted">{m.department}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {m.cgpa != null && (
                        <span className="flex items-center gap-1 text-sm text-aura-muted">
                          <Star className="w-3.5 h-3.5" /> {m.cgpa}
                        </span>
                      )}
                      {m.matchScore != null && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-aura-purple/10 text-aura-purple-light text-sm font-bold">
                          <Zap className="w-3.5 h-3.5" />
                          {typeof m.matchScore === 'number' && m.matchScore <= 1
                            ? `${Math.round(m.matchScore * 100)}%`
                            : `${Math.round(m.matchScore as number)}%`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.skills.slice(0, 6).map((sk) => (
                      <span key={sk.name} className={`px-2 py-0.5 text-xs rounded-lg ${LEVEL_COLORS[sk.level] || ''}`}>{sk.name}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">Select a job and click "Find Matches" to get AI-ranked candidates</p>
        </div>
      )}
    </div>
  )
}
