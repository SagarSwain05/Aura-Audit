'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, Youtube, BookOpen, Code2, Play, ExternalLink, Trophy, Calendar, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import { useAuditStore } from '@/store/useAuditStore'
import type { LearningResource, RoadmapDay } from '@/types'

const PLATFORM_CONFIG = {
  youtube: {
    icon: <Youtube className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  coursera: {
    icon: <BookOpen className="w-4 h-4" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  docs: {
    icon: <BookOpen className="w-4 h-4" />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  project: {
    icon: <Code2 className="w-4 h-4" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
}

function ResourceCard({ resource }: { resource: LearningResource }) {
  const cfg = PLATFORM_CONFIG[resource.platform] || PLATFORM_CONFIG.docs

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} hover:opacity-90 transition-opacity group`}
    >
      {resource.thumbnail ? (
        <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-aura-surface">
          <Image
            src={resource.thumbnail}
            alt={resource.title}
            width={80}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <span className={cfg.color}>{cfg.icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-aura-text leading-tight line-clamp-2 mb-1">{resource.title}</p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${cfg.color}`}>{resource.platform}</span>
          <span className="text-[10px] text-aura-muted">· {resource.duration}</span>
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-aura-muted shrink-0 group-hover:text-aura-purple transition-colors mt-0.5" />
    </a>
  )
}

function DayCard({ day, isCompleted, onToggle }: { day: RoadmapDay; isCompleted: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(day.day <= 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: day.day * 0.03 }}
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        isCompleted
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-aura-border bg-aura-card'
      }`}
    >
      {/* Day header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Circle className="w-6 h-6 text-aura-border hover:text-aura-purple transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
              isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-aura-purple/20 text-aura-purple-light'
            }`}>
              Day {day.day}
            </span>
            <span className="font-semibold text-sm truncate">{day.topic}</span>
          </div>
          <p className="text-xs text-aura-muted truncate">{day.goal}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-aura-muted">{day.resources.length} resources</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-aura-muted" /> : <ChevronDown className="w-4 h-4 text-aura-muted" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-aura-border/50 pt-3 space-y-3">
              {/* Goal */}
              <div className="flex items-start gap-2 text-sm">
                <Trophy className="w-4 h-4 text-aura-amber shrink-0 mt-0.5" />
                <p className="text-aura-muted-light">{day.goal}</p>
              </div>

              {/* Resources */}
              {day.resources.length > 0 && (
                <div className="space-y-2">
                  {day.resources.map((r, i) => (
                    <ResourceCard key={i} resource={r} />
                  ))}
                </div>
              )}

              {/* Project idea */}
              {day.project_idea && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-aura-purple/10 border border-aura-purple/20">
                  <Lightbulb className="w-4 h-4 text-aura-purple-light shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-aura-purple-light font-semibold uppercase tracking-wider mb-1">
                      Project Idea
                    </p>
                    <p className="text-sm text-aura-muted-light">{day.project_idea}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function RoadmapPage() {
  const router = useRouter()
  const { roadmap, completedDays, toggleDayComplete } = useAuditStore()

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-aura-bg">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 text-center">
          <Calendar className="w-12 h-12 text-aura-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Roadmap Yet</h2>
          <p className="text-aura-muted mb-6">
            Go to your audit results and click "Bridge the Gap" to generate your personalized learning roadmap.
          </p>
          <Link href="/dashboard" className="btn-primary">View My Audits</Link>
        </div>
      </div>
    )
  }

  const totalDays = roadmap.days.length
  const completedCount = roadmap.days.filter(d => completedDays.has(d.day)).length
  const progressPct = Math.round((completedCount / totalDays) * 100)

  return (
    <div className="min-h-screen bg-aura-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 py-4 mb-6">
          <button onClick={() => router.back()} className="text-aura-muted hover:text-aura-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-xl">{roadmap.skill} Roadmap</h1>
            <p className="text-xs text-aura-muted">{totalDays}-day personalized learning plan</p>
          </div>
        </div>

        {/* Progress overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 mb-6 gradient-border"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-lg">{completedCount} / {totalDays} days complete</p>
              <p className="text-xs text-aura-muted">Keep going — consistency beats intensity</p>
            </div>
            <div className="relative w-16 h-16">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#1E1E2E" strokeWidth="5" />
                <motion.circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="163"
                  animate={{ strokeDashoffset: 163 - (163 * progressPct) / 100 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-white">{progressPct}%</span>
              </div>
            </div>
          </div>
          <div className="h-2 bg-aura-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Days list */}
        <div className="space-y-3">
          {roadmap.days.map((day) => (
            <DayCard
              key={day.day}
              day={day}
              isCompleted={completedDays.has(day.day)}
              onToggle={() => toggleDayComplete(day.day)}
            />
          ))}
        </div>

        {/* Completion state */}
        {completedCount === totalDays && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 glass-card p-8 text-center border-green-500/30 bg-green-500/5"
          >
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-bold text-xl mb-2">Roadmap Complete! 🎉</h3>
            <p className="text-aura-muted mb-4">
              You've completed all {totalDays} days. Time to update your resume and re-audit!
            </p>
            <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
              Re-audit My Resume
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
