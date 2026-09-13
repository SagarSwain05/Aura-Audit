'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Linkedin, MapPin, Briefcase, Search, GraduationCap, Building2,
  Loader2, UserPlus, Check, X, Clock, Mail, Sparkles, Inbox, Send, Circle, BadgeCheck,
} from 'lucide-react'
import { alumniApi, jobsApi, studentApi } from '@/lib/api'
import toast from 'react-hot-toast'

type Catalog = Record<string, string[]>

/** Searchable typeahead against a flat list, with a "use my own text" escape hatch. */
function CatalogPicker({
  value, onChange, options, icon: Icon, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  icon: typeof Search
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8)
  }, [value, options])

  return (
    <div ref={ref} className="relative flex-1 min-w-40">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field pl-9 text-sm w-full"
      />
      {open && (
        <div className="absolute z-20 mt-1.5 w-full glass-card border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xl">
          {suggestions.length > 0 ? (
            suggestions.map((o) => (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-aura-muted" />
                <span className="truncate">{o}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-xs text-aura-muted">No catalog matches — your own text will be used as typed.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface AlumniCard {
  id: string
  studentId: string
  name: string
  profilePic: string
  university: string
  department: string
  graduationYear: number | null
  currentCompany: string
  currentRole: string
  experience: number
  location: string
  skills: string[]
  bio: string
  isAvailableForMentorship: boolean
  mentorshipAreas: string[]
  verified: boolean
  linkedinUrl: string
  recentlyActive: boolean
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected'
  connectionRequestId: string | null
  email: string | null
}

interface ConnReq {
  _id: string
  message: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  from?: { _id: string; name: string; email: string }
  to?: { _id: string; name: string; email: string }
}

type Tab = 'directory' | 'requests'

export default function AlumniPage() {
  const [tab, setTab] = useState<Tab>('directory')

  // Directory state
  const [alumni, setAlumni] = useState<AlumniCard[]>([])
  const [loading, setLoading] = useState(true)
  const [fetched, setFetched] = useState(false)
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [skill, setSkill] = useState('')
  const [mentorOnly, setMentorOnly] = useState(false)
  const [universityOnly, setUniversityOnly] = useState(true)
  const [roleCatalog, setRoleCatalog] = useState<Catalog>({})
  const [locationCatalog, setLocationCatalog] = useState<Catalog>({})
  const [skillCatalog, setSkillCatalog] = useState<Catalog>({})
  const flatRoles = useMemo(() => Object.values(roleCatalog).flat(), [roleCatalog])
  const flatLocations = useMemo(() => Object.values(locationCatalog).flat(), [locationCatalog])
  const flatSkills = useMemo(() => Object.values(skillCatalog).flat(), [skillCatalog])

  // Requests state
  const [incoming, setIncoming] = useState<ConnReq[]>([])
  const [outgoing, setOutgoing] = useState<ConnReq[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  // Connect modal
  const [connectTarget, setConnectTarget] = useState<AlumniCard | null>(null)
  const [connectNote, setConnectNote] = useState('')
  const [connecting, setConnecting] = useState(false)

  // My alumni profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    currentCompany: '', currentRole: '', graduationYear: '', experience: '',
    skills: '', isAvailableForMentorship: true, mentorshipAreas: '', bio: '', linkedinUrl: '',
  })

  const fetchDirectory = useCallback(async () => {
    setLoading(true)
    setFetched(true)
    try {
      const params: Record<string, string> = { scope: universityOnly ? 'university' : 'all' }
      if (search) params.search = search
      if (company) params.company = company
      if (role) params.role = role
      if (location) params.location = location
      if (skill) params.skill = skill
      if (mentorOnly) params.mentorOnly = 'true'
      const r = await alumniApi.getDirectory(params)
      setAlumni(r.data.alumni || [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load alumni directory')
    } finally {
      setLoading(false)
    }
  }, [search, company, role, location, skill, mentorOnly, universityOnly])

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const r = await alumniApi.getRequests()
      setIncoming(r.data.incoming || [])
      setOutgoing(r.data.outgoing || [])
    } catch {
      // silent — requests tab shows its own empty state
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.allSettled([
      jobsApi.getRoleCatalog(),
      jobsApi.getLocationCatalog(),
      studentApi.getSkillCatalog(),
      alumniApi.getMyProfile(),
    ]).then(([roleRes, locRes, skillRes, meRes]) => {
      if (roleRes.status === 'fulfilled') setRoleCatalog(roleRes.value.data.catalog || {})
      if (locRes.status === 'fulfilled') setLocationCatalog(locRes.value.data.catalog || {})
      if (skillRes.status === 'fulfilled') setSkillCatalog(skillRes.value.data.catalog || {})
      if (meRes.status === 'fulfilled') {
        const { alumni: mine, defaults } = meRes.value.data
        setHasProfile(!!mine)
        setProfileForm({
          currentCompany: mine?.currentCompany || '',
          currentRole: mine?.currentRole || '',
          graduationYear: mine?.graduationYear ? String(mine.graduationYear) : '',
          experience: mine?.experience ? String(mine.experience) : '',
          skills: (mine?.skills || defaults?.skills || []).join(', '),
          isAvailableForMentorship: mine ? !!mine.isAvailableForMentorship : true,
          mentorshipAreas: (mine?.mentorshipAreas || []).join(', '),
          bio: mine?.bio || defaults?.bio || '',
          linkedinUrl: mine?.linkedinUrl || defaults?.linkedinUrl || '',
        })
      }
    })
    fetchDirectory()
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live refetch on filter change (debounced for text fields)
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    const t = setTimeout(fetchDirectory, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, company, role, location, skill, mentorOnly, universityOnly])

  const openConnect = (a: AlumniCard) => {
    setConnectTarget(a)
    setConnectNote(`Hi ${a.name.split(' ')[0]}, fellow ${a.university || 'alum'} here — `)
  }

  const submitConnect = async () => {
    if (!connectTarget || !connectNote.trim()) return
    setConnecting(true)
    try {
      await alumniApi.connect(connectTarget.id, connectNote.trim())
      toast.success('Connection request sent!')
      setAlumni((prev) => prev.map((a) => a.id === connectTarget.id ? { ...a, connectionStatus: 'pending_sent' } : a))
      setConnectTarget(null)
      setConnectNote('')
      fetchRequests()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to send request')
    } finally {
      setConnecting(false)
    }
  }

  const respond = async (id: string, action: 'accept' | 'decline') => {
    setRespondingId(id)
    try {
      await alumniApi.respondToRequest(id, action)
      toast.success(action === 'accept' ? 'Connected!' : 'Request declined')
      setIncoming((prev) => prev.filter((r) => r._id !== id))
      if (action === 'accept') fetchDirectory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to respond')
    } finally {
      setRespondingId(null)
    }
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      const yr = parseInt(profileForm.graduationYear, 10)
      const exp = parseFloat(profileForm.experience)
      await alumniApi.saveMyProfile({
        currentCompany: profileForm.currentCompany.trim(),
        currentRole: profileForm.currentRole.trim(),
        graduationYear: Number.isFinite(yr) ? yr : undefined,
        experience: Number.isFinite(exp) ? exp : 0,
        skills: profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        isAvailableForMentorship: profileForm.isAvailableForMentorship,
        mentorshipAreas: profileForm.mentorshipAreas.split(',').map((s) => s.trim()).filter(Boolean),
        bio: profileForm.bio.trim(),
        linkedinUrl: profileForm.linkedinUrl.trim(),
      })
      toast.success('Your alumni profile is live')
      setHasProfile(true)
      setProfileModalOpen(false)
      fetchDirectory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const connectionButton = (a: AlumniCard) => {
    if (a.connectionStatus === 'connected') {
      return (
        <span className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-emerald-400/10 text-emerald-400 font-semibold">
          <Check className="w-3.5 h-3.5" /> Connected
        </span>
      )
    }
    if (a.connectionStatus === 'pending_sent') {
      return (
        <span className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-white/5 text-aura-muted font-semibold">
          <Clock className="w-3.5 h-3.5" /> Pending
        </span>
      )
    }
    if (a.connectionStatus === 'pending_received') {
      return (
        <button
          onClick={() => setTab('requests')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-aura-purple/10 text-aura-purple-light font-semibold hover:bg-aura-purple/20 transition-all"
        >
          <Inbox className="w-3.5 h-3.5" /> Respond to their request
        </button>
      )
    }
    return (
      <button
        onClick={() => openConnect(a)}
        className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
      >
        <UserPlus className="w-3.5 h-3.5" /> Connect
      </button>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alumni Connect</h1>
          <p className="text-aura-muted text-sm mt-1">
            Find real people from your college, filter by company/role/skills, and send a warm intro.
          </p>
        </div>
        <button
          onClick={() => setProfileModalOpen(true)}
          className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {hasProfile ? 'Edit My Alumni Profile' : 'List Yourself as Alumni'}
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        <button
          onClick={() => setTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === 'directory' ? 'bg-aura-gradient text-white' : 'text-aura-muted hover:text-aura-text'}`}
        >
          Directory
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === 'requests' ? 'bg-aura-gradient text-white' : 'text-aura-muted hover:text-aura-text'}`}
        >
          Requests
          {incoming.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full font-bold">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'directory' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, company, role..." className="input-field pl-9 text-sm w-full" />
              </div>
              <div className="relative flex-1 min-w-40">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="input-field pl-9 text-sm w-full" />
              </div>
              <CatalogPicker value={role} onChange={setRole} options={flatRoles} icon={Briefcase} placeholder="What they do" />
              <CatalogPicker value={location} onChange={setLocation} options={flatLocations} icon={MapPin} placeholder="Where they live" />
              <CatalogPicker value={skill} onChange={setSkill} options={flatSkills} icon={Sparkles} placeholder="Skilled at" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setUniversityOnly(!universityOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${universityOnly ? 'border-aura-purple bg-aura-purple/10 text-aura-purple-light' : 'border-white/10 text-aura-muted hover:border-white/20'}`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> My university only
              </button>
              <button
                onClick={() => setMentorOnly(!mentorOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mentorOnly ? 'border-aura-purple bg-aura-purple/10 text-aura-purple-light' : 'border-white/10 text-aura-muted hover:border-white/20'}`}
              >
                Open to mentoring
              </button>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-32" />
                      <div className="h-3 bg-white/5 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05 }}
                  className="glass-card p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-aura-gradient flex items-center justify-center text-white font-bold">
                          {a.name.charAt(0)}
                        </div>
                        {a.recentlyActive && (
                          <span className="absolute -bottom-0.5 -right-0.5" title="Active recently">
                            <Circle className="w-3 h-3 fill-emerald-400 text-emerald-400 stroke-[3px]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm">{a.name}</p>
                          {a.verified && (
                            <span title="Verified by their university placement office">
                              <BadgeCheck className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-aura-muted">
                          {a.university || 'Aura-Audit'}{a.graduationYear ? ` · Class of ${a.graduationYear}` : ''}
                        </p>
                      </div>
                    </div>
                    {a.isAvailableForMentorship && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 shrink-0">Mentor</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {(a.currentRole || a.currentCompany) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-3.5 h-3.5 text-aura-muted shrink-0" />
                        <span className="truncate">{a.currentRole || 'Professional'}{a.currentCompany && ` @ ${a.currentCompany}`}</span>
                      </div>
                    )}
                    {a.location && (
                      <div className="flex items-center gap-2 text-sm text-aura-muted">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{a.location}</span>
                      </div>
                    )}
                    {a.email && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{a.email}</span>
                      </div>
                    )}
                  </div>

                  {a.bio && <p className="text-xs text-aura-muted mb-3 line-clamp-2">{a.bio}</p>}

                  {a.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {a.skills.slice(0, 6).map((s) => (
                        <span key={s} className="px-2 py-0.5 text-xs bg-white/5 text-aura-muted rounded-lg">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    {connectionButton(a)}
                    {a.linkedinUrl && (
                      <a
                        href={a.linkedinUrl.startsWith('http') ? a.linkedinUrl : `https://${a.linkedinUrl}`}
                        target="_blank" rel="noopener noreferrer"
                        className="shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && fetched && alumni.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-aura-muted mb-1">
                {universityOnly ? 'No alumni have listed themselves from your university yet' : 'No alumni found matching your filters'}
              </p>
              <p className="text-xs text-aura-muted mb-4">
                {universityOnly ? 'Be the first — list yourself, or broaden the search beyond your university.' : 'Try clearing a filter.'}
              </p>
              {universityOnly && (
                <button onClick={() => setUniversityOnly(false)} className="btn-secondary text-xs px-4 py-2">
                  Search all universities
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Inbox className="w-4 h-4" /> Incoming ({incoming.length})</h2>
            {requestsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-aura-muted" />
            ) : incoming.length === 0 ? (
              <p className="text-xs text-aura-muted">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((r) => (
                  <div key={r._id} className="glass-card p-4 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">{r.from?.name}</p>
                      <p className="text-xs text-aura-muted mt-1">&ldquo;{r.message}&rdquo;</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => respond(r._id, 'accept')}
                        disabled={respondingId === r._id}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {respondingId === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accept
                      </button>
                      <button
                        onClick={() => respond(r._id, 'decline')}
                        disabled={respondingId === r._id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-aura-muted hover:bg-white/10 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Send className="w-4 h-4" /> Sent ({outgoing.length})</h2>
            {outgoing.length === 0 ? (
              <p className="text-xs text-aura-muted">You haven&apos;t sent any requests yet.</p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((r) => (
                  <div key={r._id} className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">{r.to?.name}</p>
                      <p className="text-xs text-aura-muted mt-1">&ldquo;{r.message}&rdquo;</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      r.status === 'accepted' ? 'bg-emerald-400/10 text-emerald-400'
                      : r.status === 'declined' ? 'bg-red-500/10 text-red-400'
                      : 'bg-white/5 text-aura-muted'
                    }`}>
                      {r.status === 'accepted' ? 'Connected' : r.status === 'declined' ? 'Declined' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect modal */}
      <AnimatePresence>
        {connectTarget && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-1">Connect with {connectTarget.name}</h2>
              <p className="text-xs text-aura-muted mb-4">
                A short, warm note gets far better responses than a blank request. Mention the shared connection and what you&apos;re curious about — don&apos;t ask for a job, ask for perspective.
              </p>
              <textarea
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value.slice(0, 300))}
                rows={4}
                className="input-field w-full text-sm resize-none"
                placeholder="Hi, I'm also from..."
              />
              <p className="text-[10px] text-aura-muted text-right mt-1">{connectNote.length}/300</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConnectTarget(null)} className="flex-1 text-sm px-4 py-2 rounded-xl bg-white/5 text-aura-muted hover:bg-white/10">Cancel</button>
                <button
                  onClick={submitConnect}
                  disabled={connecting || !connectNote.trim()}
                  className="btn-primary flex-1 text-sm px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My alumni profile modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-lg my-8">
              <h2 className="text-lg font-bold mb-1">{hasProfile ? 'Edit' : 'Create'} My Alumni Profile</h2>
              <p className="text-xs text-aura-muted mb-4">
                This is what other students from your university will see when they search the directory.
              </p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Current Company</label>
                    <input value={profileForm.currentCompany} onChange={(e) => setProfileForm((f) => ({ ...f, currentCompany: e.target.value }))} className="input-field text-sm w-full" placeholder="e.g. Google" />
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Current Role</label>
                    <input value={profileForm.currentRole} onChange={(e) => setProfileForm((f) => ({ ...f, currentRole: e.target.value }))} className="input-field text-sm w-full" placeholder="e.g. SDE II" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Graduation Year</label>
                    <input type="number" value={profileForm.graduationYear} onChange={(e) => setProfileForm((f) => ({ ...f, graduationYear: e.target.value }))} className="input-field text-sm w-full" placeholder="2023" />
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Years of Experience</label>
                    <input type="number" step="0.5" value={profileForm.experience} onChange={(e) => setProfileForm((f) => ({ ...f, experience: e.target.value }))} className="input-field text-sm w-full" placeholder="2" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-aura-muted mb-1 block">Skills (comma-separated)</label>
                  <input value={profileForm.skills} onChange={(e) => setProfileForm((f) => ({ ...f, skills: e.target.value }))} className="input-field text-sm w-full" placeholder="React, Node.js, GCP" />
                </div>
                <div>
                  <label className="text-xs text-aura-muted mb-1 block">LinkedIn URL</label>
                  <input value={profileForm.linkedinUrl} onChange={(e) => setProfileForm((f) => ({ ...f, linkedinUrl: e.target.value }))} className="input-field text-sm w-full" placeholder="linkedin.com/in/you" />
                </div>
                <div>
                  <label className="text-xs text-aura-muted mb-1 block">Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value.slice(0, 500) }))} rows={2} className="input-field text-sm w-full resize-none" placeholder="A line about your journey" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={profileForm.isAvailableForMentorship} onChange={(e) => setProfileForm((f) => ({ ...f, isAvailableForMentorship: e.target.checked }))} className="w-4 h-4" />
                  Open to mentoring juniors
                </label>
                {profileForm.isAvailableForMentorship && (
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Mentorship areas (comma-separated)</label>
                    <input value={profileForm.mentorshipAreas} onChange={(e) => setProfileForm((f) => ({ ...f, mentorshipAreas: e.target.value }))} className="input-field text-sm w-full" placeholder="Interview prep, Resume review" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setProfileModalOpen(false)} className="flex-1 text-sm px-4 py-2 rounded-xl bg-white/5 text-aura-muted hover:bg-white/10">Cancel</button>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="btn-primary flex-1 text-sm px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
