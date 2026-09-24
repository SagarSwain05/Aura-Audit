'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Filter, Star, MapPin, GraduationCap, ExternalLink, Loader2, Sparkles, EyeOff, Eye, X, ShieldCheck } from 'lucide-react'
import { companyApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Candidate {
  _id: string
  name: string
  email?: string
  department?: string
  cgpa?: number
  careerReadinessScore?: number
  skills: { name: string; level: string }[]
  location?: string
  dreamRole?: string
  isPlaced?: boolean
  semanticScore?: number
  blind?: boolean
  anonymousId?: string
}

interface BlindProfile {
  anonymousId: string
  department?: string
  skills: { name: string; level: string }[]
  cgpa?: number
  careerReadinessScore?: number
  badges?: { name: string }[]
  dreamRole?: string
  summary: string | null
}

const LEVEL_COLORS: Record<string, string> = {
  expert: 'bg-aura-purple/20 text-aura-purple-light',
  advanced: 'bg-cyan-400/10 text-cyan-400',
  intermediate: 'bg-emerald-400/10 text-emerald-400',
  beginner: 'bg-white/5 text-aura-muted',
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [total, setTotal] = useState(0)
  const [mode, setMode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  // UI field names kept close to what a recruiter reads, but mapped to the
  // backend's actual query param names below — they'd silently drifted
  // apart (skill→skills, minCGPA→minCgpa, maxResults→limit), so every
  // filter except department was being dropped on every search.
  const [filters, setFilters] = useState({ skill: '', minCGPA: '', department: '', maxResults: '20' })
  const [blindMode, setBlindMode] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, { name: string; email: string; location?: string; university?: string }>>({})
  const [revealing, setRevealing] = useState<string | null>(null)
  const [blindProfile, setBlindProfile] = useState<(BlindProfile & { candidateId: string }) | null>(null)
  const [profileLoading, setProfileLoading] = useState<string | null>(null)

  const handleSearch = async (blind = blindMode) => {
    setLoading(true)
    setSearched(true)
    try {
      const params: Record<string, string> = {}
      if (filters.skill) params.skills = filters.skill
      if (filters.minCGPA) params.minCgpa = filters.minCGPA
      if (filters.department) params.department = filters.department
      params.limit = filters.maxResults || '20'
      if (blind) params.blind = 'true'
      const r = await companyApi.searchCandidates(params)
      setCandidates(r.data.candidates || [])
      setTotal(r.data.total || 0)
      setMode(r.data.mode || null)
      setRevealed({})
    } catch {
      setCandidates([])
      setTotal(0)
      setMode(null)
    } finally {
      setLoading(false)
    }
  }

  // Load the full portal-wide candidate pool immediately — searching
  // shouldn't require the recruiter to first guess a filter value.
  useEffect(() => { handleSearch(false) }, []) // eslint-disable-line

  const toggleBlindMode = () => {
    const next = !blindMode
    setBlindMode(next)
    handleSearch(next)
  }

  const handleReveal = async (id: string) => {
    setRevealing(id)
    try {
      const r = await companyApi.revealCandidate(id)
      setRevealed((prev) => ({ ...prev, [id]: r.data }))
    } catch {
      toast.error('Failed to reveal candidate')
    } finally {
      setRevealing(null)
    }
  }

  const handleViewProfile = async (id: string) => {
    setProfileLoading(id)
    try {
      const r = await companyApi.getBlindProfile(id)
      setBlindProfile({ ...r.data, candidateId: id })
    } catch {
      toast.error('Failed to load blind profile')
    } finally {
      setProfileLoading(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidate Search</h1>
          <p className="text-aura-muted text-sm mt-1">Semantic role-fit search across every student on the portal — ranked by meaning, not just keyword matches</p>
        </div>
        <button
          onClick={toggleBlindMode}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all ${
            blindMode ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400' : 'border-white/10 text-aura-muted hover:border-white/20'
          }`}
        >
          {blindMode ? <EyeOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {blindMode ? 'Blind Hiring: ON' : 'Enable Blind Hiring'}
        </button>
      </div>
      {blindMode && (
        <div className="glass-card p-4 border-cyan-400/20 bg-cyan-400/5">
          <p className="text-xs text-cyan-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            Names, emails, and locations are redacted server-side — they never leave the portal. Skills, CGPA, and career readiness stay visible so screening is skill-first. Click &quot;Reveal&quot; on a candidate to un-redact them individually, or &quot;Full Profile&quot; for an AI-written, bias-neutral summary.
          </p>
        </div>
      )}

      {/* Search panel */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-aura-muted mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-aura-purple-light" /> Role Fit
            </label>
            <input type="text" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} placeholder="e.g. MERN, Full Stack Developer" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1.5 block">Min CGPA</label>
            <input type="number" value={filters.minCGPA} onChange={(e) => setFilters({ ...filters, minCGPA: e.target.value })} placeholder="e.g. 7.5" min="0" max="10" step="0.1" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1.5 block">Department</label>
            <input type="text" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} placeholder="e.g. CSE, ECE" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1.5 block">Max Results</label>
            <select value={filters.maxResults} onChange={(e) => setFilters({ ...filters, maxResults: e.target.value })} className="input-field text-sm">
              {['10', '20', '50', '100'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => handleSearch()} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search Candidates
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : searched && candidates.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No candidates match your criteria</p>
        </div>
      ) : candidates.length > 0 ? (
        <>
          <p className="text-sm text-aura-muted flex items-center gap-1.5">
            {mode === 'semantic' && <Sparkles className="w-3.5 h-3.5 text-aura-purple-light" />}
            Showing {candidates.length} of {total} candidate{total !== 1 ? 's' : ''} on the portal
            {mode === 'semantic' && <span className="text-aura-purple-light"> — ranked by semantic role fit</span>}
            {mode === 'keyword-fallback' && <span className="text-yellow-400"> — AI ranking unavailable, showing keyword matches</span>}
          </p>
          <div className="space-y-3">
            {candidates.map((c, i) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-aura-gradient flex items-center justify-center text-white font-bold flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{revealed[c._id]?.name || c.name}</h3>
                          {c.blind && !revealed[c._id] && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Blind
                            </span>
                          )}
                          {c.isPlaced && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Placed</span>}
                        </div>
                        {c.dreamRole && <p className="text-xs text-aura-muted">{c.dreamRole}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {c.semanticScore != null && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />{c.semanticScore}%</p>
                            <p className="text-xs text-aura-muted">Role Fit</p>
                          </div>
                        )}
                        {c.careerReadinessScore != null && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-aura-purple-light">{c.careerReadinessScore}%</p>
                            <p className="text-xs text-aura-muted">Career Ready</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-aura-muted">
                      {c.cgpa != null && <span className="flex items-center gap-1"><Star className="w-3 h-3" />CGPA {c.cgpa}</span>}
                      {c.department && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{c.department}</span>}
                      {(revealed[c._id]?.location || (!c.blind && c.location)) && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{revealed[c._id]?.location || c.location}</span>
                      )}
                      {revealed[c._id]?.university && (
                        <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{revealed[c._id].university}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {c.skills.slice(0, 6).map((sk) => (
                        <span key={sk.name} className={`px-2 py-0.5 text-xs rounded-lg ${LEVEL_COLORS[sk.level] || ''}`}>{sk.name}</span>
                      ))}
                    </div>
                  </div>
                  {c.blind ? (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleViewProfile(c._id)}
                        disabled={profileLoading === c._id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-aura-purple/10 text-aura-purple-light hover:bg-aura-purple/20 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {profileLoading === c._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Full Profile
                      </button>
                      {!revealed[c._id] && (
                        <button
                          onClick={() => handleReveal(c._id)}
                          disabled={revealing === c._id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-aura-muted hover:text-aura-text transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {revealing === c._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                          Reveal
                        </button>
                      )}
                    </div>
                  ) : (
                    <a href={`mailto:${c.email}`} className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {revealed[c._id] && (
                  <p className="text-[11px] text-cyan-400 mt-3 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Revealed: {revealed[c._id].name} &middot; {revealed[c._id].email}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">Use the search filters above to find candidates</p>
        </div>
      )}

      {/* Blind profile modal */}
      <AnimatePresence>
        {blindProfile && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> {blindProfile.anonymousId}
                </h2>
                <button onClick={() => setBlindProfile(null)} className="text-aura-muted hover:text-aura-text"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-aura-muted mb-4">Name, email, location and institution are withheld — this profile is judged on skills alone.</p>

              {blindProfile.summary && (
                <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15 mb-4">
                  <p className="text-[10px] uppercase tracking-wide text-cyan-400 font-semibold mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Summary — Bias-Neutral
                  </p>
                  <p className="text-sm text-aura-muted-light">{blindProfile.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <p className="text-lg font-bold text-aura-purple-light">{blindProfile.careerReadinessScore ?? '—'}%</p>
                  <p className="text-[10px] text-aura-muted">Career Ready</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <p className="text-lg font-bold">{blindProfile.cgpa ?? '—'}</p>
                  <p className="text-[10px] text-aura-muted">CGPA</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <p className="text-lg font-bold">{blindProfile.department || '—'}</p>
                  <p className="text-[10px] text-aura-muted">Department</p>
                </div>
              </div>

              {blindProfile.dreamRole && <p className="text-xs text-aura-muted mb-3">Target role: <span className="text-aura-text">{blindProfile.dreamRole}</span></p>}

              <div className="flex flex-wrap gap-1.5 mb-2">
                {blindProfile.skills.map((sk) => (
                  <span key={sk.name} className={`px-2 py-0.5 text-xs rounded-lg ${LEVEL_COLORS[sk.level] || ''}`}>{sk.name}</span>
                ))}
              </div>

              <button
                onClick={async () => {
                  await handleReveal(blindProfile.candidateId)
                  setBlindProfile(null)
                }}
                className="btn-secondary w-full text-sm px-4 py-2.5 mt-4 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Reveal &amp; Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
