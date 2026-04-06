'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, ChevronUp, ChevronDown, Loader2, CheckCircle } from 'lucide-react'
import { studentApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Skill { _id?: string; name: string; level: string; verified?: boolean }

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']
const LEVEL_COLORS: Record<string, string> = {
  expert: 'bg-aura-purple/20 text-aura-purple-light border-aura-purple/30',
  advanced: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  intermediate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  beginner: 'bg-white/5 text-aura-muted border-white/5',
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [newSkill, setNewSkill] = useState({ name: '', level: 'beginner' })
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = () => {
    studentApi.getProfile().then((r) => {
      setSkills(r.data.student?.skills || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!newSkill.name.trim()) return toast.error('Enter a skill name')
    setAdding(true)
    try {
      const r = await studentApi.addSkill(newSkill)
      setSkills(r.data.skills || [])
      setNewSkill({ name: '', level: 'beginner' })
      toast.success('Skill added!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to add skill')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (skillId: string) => {
    setRemoving(skillId)
    try {
      await studentApi.removeSkill(skillId)
      setSkills((prev) => prev.filter((s) => s._id !== skillId))
      toast.success('Skill removed')
    } catch {
      toast.error('Failed to remove skill')
    } finally {
      setRemoving(null)
    }
  }

  const handleLevelChange = async (skillId: string, level: string) => {
    try {
      const r = await studentApi.updateSkill(skillId, { level })
      setSkills(r.data.skills || skills.map((s) => s._id === skillId ? { ...s, level } : s))
    } catch {
      toast.error('Failed to update level')
    }
  }

  const byLevel = LEVELS.reduceRight((acc, level) => {
    acc[level] = skills.filter((s) => s.level === level)
    return acc
  }, {} as Record<string, Skill[]>)

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Skills</h1>
        <p className="text-aura-muted text-sm mt-1">Track and level up your technical skills (max 8 for full career score)</p>
      </div>

      {/* Add skill */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3">Add New Skill</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newSkill.name}
            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. React, Python, AWS..."
            className="input-field flex-1 min-w-48"
          />
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setNewSkill({ ...newSkill, level: l })}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize border ${
                  newSkill.level === l ? LEVEL_COLORS[l] : 'bg-white/5 border-white/5 text-aura-muted hover:bg-white/10'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={handleAdd} disabled={adding} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
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
        <div className="space-y-4">
          {LEVELS.slice().reverse().map((level) => {
            const levelSkills = byLevel[level] || []
            if (levelSkills.length === 0) return null
            return (
              <div key={level}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 capitalize ${
                  level === 'expert' ? 'text-aura-purple-light' : level === 'advanced' ? 'text-cyan-400' : level === 'intermediate' ? 'text-emerald-400' : 'text-aura-muted'
                }`}>
                  {level} ({levelSkills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {levelSkills.map((skill) => (
                    <AnimatePresence key={skill._id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${LEVEL_COLORS[level]}`}
                      >
                        {skill.verified && <CheckCircle className="w-3.5 h-3.5" />}
                        <span className="font-medium">{skill.name}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          {LEVELS.indexOf(level) < LEVELS.length - 1 && (
                            <button
                              onClick={() => skill._id && handleLevelChange(skill._id, LEVELS[LEVELS.indexOf(level) + 1])}
                              className="opacity-50 hover:opacity-100 transition-opacity"
                              title="Level up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {LEVELS.indexOf(level) > 0 && (
                            <button
                              onClick={() => skill._id && handleLevelChange(skill._id, LEVELS[LEVELS.indexOf(level) - 1])}
                              className="opacity-50 hover:opacity-100 transition-opacity"
                              title="Level down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => skill._id && handleRemove(skill._id)}
                            disabled={removing === skill._id}
                            className="opacity-50 hover:opacity-100 hover:text-red-400 transition-all ml-0.5"
                          >
                            {removing === skill._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
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
