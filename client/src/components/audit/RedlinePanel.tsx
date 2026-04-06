'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ChevronDown, ChevronUp, Wand2, AlertTriangle, Info, Zap } from 'lucide-react'
import type { Redline } from '@/types'
import { getSeverityColor, getSeverityBadgeColor, getCategoryIcon } from '@/lib/utils'
import { useAuditStore } from '@/store/useAuditStore'
import { auditApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface RedlinePanelProps {
  redlines: Redline[]
  auditId: string
}

const SEVERITY_ORDER = { critical: 0, warning: 1, improvement: 2 }
const FILTERS = ['all', 'critical', 'warning', 'improvement'] as const

function RedlineCard({ redline, onAccept }: { redline: Redline; onAccept: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanced, setEnhanced] = useState<string | null>(null)

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setEnhancing(true)
    try {
      const res = await auditApi.enhanceBullet(redline.original)
      setEnhanced(res.data.enhanced)
    } catch {
      toast.error('Enhancement failed')
    } finally {
      setEnhancing(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
        redline.accepted ? 'opacity-50 border-aura-border' : getSeverityColor(redline.severity)
      }`}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-lg shrink-0 mt-0.5">{getCategoryIcon(redline.category)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`badge text-[10px] ${getSeverityBadgeColor(redline.severity)}`}>
              {redline.severity === 'critical' && <AlertTriangle className="w-3 h-3" />}
              {redline.severity === 'warning' && <Info className="w-3 h-3" />}
              {redline.severity === 'improvement' && <Zap className="w-3 h-3" />}
              {redline.severity}
            </span>
            <span className="badge bg-aura-surface text-aura-muted border-aura-border text-[10px]">
              {redline.category.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-aura-muted line-clamp-2 font-mono">
            <span className="line-through opacity-60">{redline.original}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {redline.accepted && <Check className="w-4 h-4 text-green-400" />}
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
              {/* Reason */}
              <div>
                <p className="text-[10px] text-aura-muted uppercase tracking-wider mb-1">Why this matters</p>
                <p className="text-sm text-aura-muted-light">{redline.reason}</p>
              </div>

              {/* Suggestion */}
              <div className="bg-aura-surface rounded-xl p-3 border border-aura-border">
                <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1.5 font-medium">
                  ✨ Suggested rewrite
                </p>
                <p className="text-sm text-aura-text font-medium">
                  {enhanced || redline.suggestion}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onAccept}
                  disabled={redline.accepted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    redline.accepted
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  {redline.accepted ? 'Applied' : 'Accept'}
                </button>
                <button
                  onClick={handleEnhance}
                  disabled={enhancing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-aura-purple/10 text-aura-purple-light border border-aura-purple/20 hover:bg-aura-purple/20 transition-all"
                >
                  <Wand2 className="w-3 h-3" />
                  {enhancing ? 'Enhancing...' : 'AI Enhance'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function RedlinePanel({ redlines, auditId }: RedlinePanelProps) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const { updateRedlineAccepted } = useAuditStore()

  const sorted = [...redlines].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const filtered = filter === 'all' ? sorted : sorted.filter((r) => r.severity === filter)

  const counts = {
    all: redlines.length,
    critical: redlines.filter((r) => r.severity === 'critical').length,
    warning: redlines.filter((r) => r.severity === 'warning').length,
    improvement: redlines.filter((r) => r.severity === 'improvement').length,
  }

  const acceptedCount = redlines.filter((r) => r.accepted).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-aura-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">AI Redlines</h3>
          <span className="text-xs text-aura-muted">
            {acceptedCount}/{redlines.length} applied
          </span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-aura-border rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-aura-gradient rounded-full transition-all duration-500"
            style={{ width: `${redlines.length ? (acceptedCount / redlines.length) * 100 : 0}%` }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                filter === f
                  ? f === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    f === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    f === 'improvement' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    'bg-aura-purple/20 text-aura-purple-light border border-aura-purple/30'
                  : 'text-aura-muted border border-aura-border hover:border-aura-purple/30'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Redlines list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-aura-muted">
              <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="font-medium text-aura-text">No {filter !== 'all' ? filter : ''} issues!</p>
              <p className="text-sm mt-1">This section looks clean.</p>
            </div>
          ) : (
            filtered.map((redline) => (
              <RedlineCard
                key={redline.line_index}
                redline={redline}
                onAccept={() => updateRedlineAccepted(redline.line_index, !redline.accepted)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
