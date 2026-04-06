'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, Filter, Star, MapPin, GraduationCap, ExternalLink, Loader2 } from 'lucide-react'
import { companyApi } from '@/lib/api'

interface Candidate {
  _id: string
  name: string
  email: string
  department?: string
  cgpa?: number
  careerReadinessScore?: number
  skills: { name: string; level: string }[]
  location?: string
  dreamRole?: string
  isPlaced?: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  expert: 'bg-aura-purple/20 text-aura-purple-light',
  advanced: 'bg-cyan-400/10 text-cyan-400',
  intermediate: 'bg-emerald-400/10 text-emerald-400',
  beginner: 'bg-white/5 text-aura-muted',
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filters, setFilters] = useState({ skill: '', minCGPA: '', department: '', maxResults: '20' })

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const r = await companyApi.searchCandidates(params)
      setCandidates(r.data.candidates || [])
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Candidate Search</h1>
        <p className="text-aura-muted text-sm mt-1">Search students by skills, CGPA, and department</p>
      </div>

      {/* Search panel */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-aura-muted mb-1.5 block">Skill</label>
            <input type="text" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} placeholder="e.g. React, Python" className="input-field text-sm" />
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
              {['10', '20', '50'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5">
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
          <p className="text-sm text-aura-muted">{candidates.length} candidates found</p>
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
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.isPlaced && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Placed</span>}
                        </div>
                        {c.dreamRole && <p className="text-xs text-aura-muted">{c.dreamRole}</p>}
                      </div>
                      {c.careerReadinessScore != null && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-aura-purple-light">{c.careerReadinessScore}%</p>
                          <p className="text-xs text-aura-muted">Career Ready</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-aura-muted">
                      {c.cgpa != null && <span className="flex items-center gap-1"><Star className="w-3 h-3" />CGPA {c.cgpa}</span>}
                      {c.department && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{c.department}</span>}
                      {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {c.skills.slice(0, 6).map((sk) => (
                        <span key={sk.name} className={`px-2 py-0.5 text-xs rounded-lg ${LEVEL_COLORS[sk.level] || ''}`}>{sk.name}</span>
                      ))}
                    </div>
                  </div>
                  <a href={`mailto:${c.email}`} className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
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
    </div>
  )
}
