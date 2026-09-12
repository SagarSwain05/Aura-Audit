'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, ChevronUp, ChevronDown, Loader2, CheckCircle,
  Code2, MessageSquare, BarChart2, Globe, Sparkles, FileText, Calendar,
} from 'lucide-react'
import { studentApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Skill {
  name: string
  level: string
  category: string
  source?: string
  verified?: boolean
  addedAt?: string
}

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']
const LEVEL_COLORS: Record<string, string> = {
  expert: 'bg-aura-purple/20 text-aura-purple-light border-aura-purple/30',
  advanced: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  intermediate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  beginner: 'bg-white/5 text-aura-muted border-white/5',
}

const CATEGORIES = ['technical', 'communication', 'quantitative', 'real_world'] as const
const CATEGORY_META: Record<string, { label: string; icon: typeof Code2; color: string; bg: string; border: string }> = {
  technical: { label: 'Technical', icon: Code2, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10', border: 'border-aura-purple/20' },
  communication: { label: 'Communication', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  quantitative: { label: 'Quantitative', icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  real_world: { label: 'Real-World', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
}

function SkillCard({
  skill, onLevelChange, onCategoryChange, onRemove, onImprove, removing,
}: {
  skill: Skill
  onLevelChange: (level: string) => void
  onCategoryChange: (category: string) => void
  onRemove: () => void
  onImprove: () => void
  removing: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const levelIdx = LEVELS.indexOf(skill.level)
  const meta = CATEGORY_META[skill.category] || CATEGORY_META.technical

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border overflow-hidden transition-all ${LEVEL_COLORS[skill.level]}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
      >
        {skill.verified && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
        <span className="font-medium flex-1 truncate">{skill.name}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-70 shrink-0">{skill.level}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
              {/* Details */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-aura-muted">
                {skill.addedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Added {new Date(skill.addedAt).toLocaleDateString()}
                  </span>
                )}
                {skill.source && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {skill.source === 'resume' ? 'From resume' : 'Added manually'}
                  </span>
                )}
              </div>

              {/* Level control */}
              <div>
                <p className="text-[10px] text-aura-muted uppercase tracking-wider mb-1.5">Level</p>
                <div className="flex gap-1">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => onLevelChange(l)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium capitalize border transition-all ${
                        l === skill.level ? LEVEL_COLORS[l] : 'bg-white/5 border-white/5 text-aura-muted hover:bg-white/10'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category control */}
              <div>
                <p className="text-[10px] text-aura-muted uppercase tracking-wider mb-1.5">Category</p>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => {
                    const m = CATEGORY_META[c]
                    return (
                      <button
                        key={c}
                        onClick={() => onCategoryChange(c)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          c === skill.category ? `${m.bg} ${m.color} ${m.border}` : 'bg-white/5 border-white/5 text-aura-muted hover:bg-white/10'
                        }`}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onImprove}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-aura-purple/10 text-aura-purple-light border border-aura-purple/20 hover:bg-aura-purple/20 transition-all"
                >
                  <Sparkles className="w-3 h-3" /> Improve with Assessment
                </button>
                <button
                  onClick={onRemove}
                  disabled={removing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function SkillsPage() {
  const router = useRouter()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [newSkill, setNewSkill] = useState({ name: '', level: 'beginner', category: 'technical' })
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = () => {
    studentApi.getProfile().then((r) => {
      setSkills(r.data.student?.skills || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const name = newSkill.name.trim()
    if (!name) return toast.error('Enter a skill name')
    if (skills.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return toast.error('Skill already added')
    }

    // Optimistic: show it immediately, reconcile with the server's response.
    const optimisticSkill: Skill = { name, level: newSkill.level, category: newSkill.category, addedAt: new Date().toISOString() }
    setSkills((prev) => [...prev, optimisticSkill])
    setNewSkill({ name: '', level: 'beginner', category: 'technical' })
    setAdding(true)
    try {
      const r = await studentApi.addSkill({ name, level: newSkill.level, category: newSkill.category })
      setSkills(r.data.skills || [])
      toast.success('Skill added!')
    } catch (err: unknown) {
      setSkills((prev) => prev.filter((s) => s.name.toLowerCase() !== name.toLowerCase()))
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to add skill')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (name: string) => {
    setRemoving(name)
    const prevSkills = skills
    setSkills((prev) => prev.filter((s) => s.name !== name))
    try {
      await studentApi.removeSkill(name)
      toast.success('Skill removed')
    } catch {
      setSkills(prevSkills)
      toast.error('Failed to remove skill')
    } finally {
      setRemoving(null)
    }
  }

  const handleLevelChange = async (name: string, level: string) => {
    const prevSkills = skills
    setSkills((prev) => prev.map((s) => (s.name === name ? { ...s, level } : s)))
    try {
      const r = await studentApi.updateSkill(name, { level })
      if (r.data.skills) setSkills(r.data.skills)
    } catch {
      setSkills(prevSkills)
      toast.error('Failed to update level')
    }
  }

  const handleCategoryChange = async (name: string, category: string) => {
    const prevSkills = skills
    setSkills((prev) => prev.map((s) => (s.name === name ? { ...s, category } : s)))
    try {
      const r = await studentApi.updateSkill(name, { category })
      if (r.data.skills) setSkills(r.data.skills)
    } catch {
      setSkills(prevSkills)
      toast.error('Failed to update category')
    }
  }

  const handleImprove = (skill: Skill) => {
    router.push(`/student/assessments?skill=${encodeURIComponent(skill.name)}&level=${encodeURIComponent(skill.level === 'expert' ? 'advanced' : skill.level)}`)
  }

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = skills.filter((s) => (s.category || 'technical') === cat)
    return acc
  }, {} as Record<string, Skill[]>)

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Skills</h1>
        <p className="text-aura-muted text-sm mt-1">Track your technical, communication, quantitative & real-world skills (max 8 for full career score)</p>
      </div>

      {/* Add skill */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3">Add New Skill</h2>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. React, Public Speaking, Data Analysis, Project Management..."
              className="input-field flex-1 min-w-48"
            />
            <button onClick={handleAdd} disabled={adding} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setNewSkill({ ...newSkill, level: l })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize border ${
                    newSkill.level === l ? LEVEL_COLORS[l] : 'bg-white/5 border-white/5 text-aura-muted hover:bg-white/10'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {CATEGORIES.map((c) => {
                const m = CATEGORY_META[c]
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSkill({ ...newSkill, category: c })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-1 ${
                      newSkill.category === c ? `${m.bg} ${m.color} ${m.border}` : 'bg-white/5 border-white/5 text-aura-muted hover:bg-white/10'
                    }`}
                  >
                    <m.icon className="w-3 h-3" /> {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Career score indicator */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Skills for Career Score</span>
          <span className="text-sm font-bold">{Math.min(skills.length, 8)}/8</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-aura-gradient rounded-full transition-all duration-500"
            style={{ width: `${(Math.min(skills.length, 8) / 8) * 100}%` }}
          />
        </div>
        <p className="text-xs text-aura-muted mt-1.5">Each skill contributes to your 50% skill score component</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : skills.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No skills yet. Add your first skill above!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((cat) => {
            const catSkills = byCategory[cat] || []
            if (catSkills.length === 0) return null
            const m = CATEGORY_META[cat]
            return (
              <div key={cat}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${m.color}`}>
                  <m.icon className="w-3.5 h-3.5" /> {m.label} ({catSkills.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {catSkills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      removing={removing === skill.name}
                      onLevelChange={(level) => handleLevelChange(skill.name, level)}
                      onCategoryChange={(category) => handleCategoryChange(skill.name, category)}
                      onRemove={() => handleRemove(skill.name)}
                      onImprove={() => handleImprove(skill)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
