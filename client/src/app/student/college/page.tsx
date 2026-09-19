'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { School, Search, MapPin, CheckCircle2, Circle, Loader2, Building2 } from 'lucide-react'
import { studentApi, universityCatalogApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface CatalogEntry {
  id: string
  name: string
  state: string
  type: 'university' | 'college'
  parentUniversity: { id: string; name: string } | null
  claimed: boolean
  totalStudents: number
}

interface CurrentUniversity {
  _id: string
  name: string
  state?: string
  type?: 'university' | 'college'
  location?: string
  parentUniversity?: { name: string } | null
  userId?: string | null
}

export default function CollegeUniversityPage() {
  const [current, setCurrent] = useState<CurrentUniversity | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogEntry[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    studentApi.getProfile().then((r) => {
      setCurrent(r.data.student?.university || null)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!showPicker) return
    debounceRef.current = setTimeout(() => {
      setSearching(true)
      universityCatalogApi.search({ search: query || undefined })
        .then((r) => setResults(r.data.universities || []))
        .finally(() => setSearching(false))
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, showPicker])

  const selectUniversity = async (id: string) => {
    setSaving(true)
    try {
      const r = await studentApi.setUniversity({ universityId: id })
      setCurrent(r.data.student?.university || null)
      setShowPicker(false)
      setQuery('')
      toast.success('University updated!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to update university')
    } finally {
      setSaving(false)
    }
  }

  const addCustom = async () => {
    if (!query.trim()) return
    setSaving(true)
    try {
      const r = await studentApi.setUniversity({ universityName: query.trim() })
      setCurrent(r.data.student?.university || null)
      setShowPicker(false)
      setQuery('')
      toast.success('University added — you can update it anytime')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to add university')
    } finally {
      setSaving(false)
    }
  }

  const exactMatch = useMemo(
    () => results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()),
    [results, query]
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-aura-purple" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">College / University</h1>
        <p className="text-aura-muted text-sm mt-1">
          Affiliate with your institution to unlock Alumni Connect from your own college and see placement notices from your university.
        </p>
      </div>

      {current ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-aura-gradient flex items-center justify-center flex-shrink-0">
              <School className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg">{current.name}</h2>
                {current.userId ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> On Aura-Audit
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-aura-muted">
                    <Circle className="w-3 h-3" /> Not yet registered on the platform
                  </span>
                )}
              </div>
              {current.parentUniversity && (
                <p className="text-sm text-aura-muted mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Affiliated to {current.parentUniversity.name}
                </p>
              )}
              {(current.location || current.state) && (
                <p className="text-sm text-aura-muted mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {[current.location, current.state].filter(Boolean).join(', ')}
                </p>
              )}
              {!current.userId && (
                <p className="text-xs text-aura-muted mt-3">
                  Your institution hasn&apos;t registered a placement-cell account yet — you&apos;ll still see alumni from other students who picked the same college. Placement notices will appear once your college signs up.
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setShowPicker(true)} className="btn-secondary text-sm px-4 py-2 mt-4">
            Change University
          </button>
        </motion.div>
      ) : (
        <div className="glass-card p-8 text-center">
          <School className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted mb-4">You haven&apos;t set your college/university yet</p>
          <button onClick={() => setShowPicker(true)} className="btn-primary text-sm px-6 py-2.5">
            Choose My University
          </button>
        </div>
      )}

      {showPicker && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by college/university name..."
              className="input-field pl-9 w-full"
            />
          </div>

          {searching ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-aura-muted" /></div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectUniversity(r.id)}
                  disabled={saving}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-aura-muted">
                      {r.type === 'college' ? 'College' : 'University'}
                      {r.parentUniversity && ` · affiliated to ${r.parentUniversity.name}`}
                      {r.state && ` · ${r.state}`}
                    </p>
                  </div>
                  {r.claimed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 flex-shrink-0">On platform</span>
                  )}
                </button>
              ))}
              {!searching && results.length === 0 && query && (
                <p className="text-xs text-aura-muted text-center py-4">No matches — you can add it below.</p>
              )}
            </div>
          )}

          {query.trim() && !exactMatch && (
            <button
              onClick={addCustom}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-aura-muted hover:text-aura-text hover:border-white/30 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Can&apos;t find it? Add &quot;{query.trim()}&quot; as my college
            </button>
          )}

          <button onClick={() => { setShowPicker(false); setQuery('') }} className="text-xs text-aura-muted hover:text-aura-text mx-auto block">
            Cancel
          </button>
        </motion.div>
      )}
    </div>
  )
}
