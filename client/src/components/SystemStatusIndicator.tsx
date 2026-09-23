'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSystemStatus } from '@/hooks/useSystemStatus'

const DOT_CONFIG = {
  checking: { color: '#94A3B8', label: 'Checking…', pulse: true },
  online: { color: '#22C55E', label: 'AI Engine Online', pulse: false },
  offline: { color: '#EF4444', label: 'AI Engine Offline', pulse: false },
  waking: { color: '#F59E0B', label: 'Starting AI Engine…', pulse: true },
}

// Live, always-visible signal for whether the AI engine (resume audit,
// assessments, job matching, career match, gap analysis, market pulse,
// interview sim — everything that routes through it) is actually reachable
// right now, plus a way to explicitly wake it up rather than discovering
// it was asleep only after an AI request comes back as a placeholder result.
export default function SystemStatusIndicator() {
  const { aiState, serverOnline, latencyMs, lastCheckedAt, llmCallError, wake } = useSystemStatus()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = DOT_CONFIG[aiState]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleWake = async () => {
    toast.loading('Waking the AI engine — this can take up to 60s on a cold start…', { id: 'wake-ai' })
    await wake()
    toast.dismiss('wake-ai')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-1.5 transition-all"
        style={{ border: '1px solid rgb(var(--c-bord))', color: 'rgb(var(--c-muted))' }}
        title="AI engine status"
      >
        <span className="relative flex w-2 h-2 shrink-0">
          {cfg.pulse && (
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: cfg.color }}
            />
          )}
          <span className="relative inline-flex rounded-full w-2 h-2" style={{ backgroundColor: cfg.color }} />
        </span>
        <span className="hidden sm:inline whitespace-nowrap">{cfg.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 top-11 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--c-card))', border: '1px solid rgb(var(--c-bord))' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgb(var(--c-bord))' }}>
              <p className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text))' }}>System Status</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--c-muted))' }}>
                Live check of everything AI-related — audit, assessments, job search, career match, gap analysis, market pulse, interview sim.
              </p>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'rgb(var(--c-muted))' }}>Backend server</span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: serverOnline ? '#22C55E' : '#EF4444' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: serverOnline ? '#22C55E' : '#EF4444' }} />
                  {serverOnline ? 'Online' : 'Unreachable'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'rgb(var(--c-muted))' }}>AI engine</span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: cfg.color }}>
                  <span className="relative flex w-1.5 h-1.5">
                    {cfg.pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: cfg.color }} />}
                    <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ backgroundColor: cfg.color }} />
                  </span>
                  {cfg.label}
                </span>
              </div>
              {latencyMs != null && aiState === 'online' && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'rgb(var(--c-muted))' }}>Response time</span>
                  <span className="text-[12px]" style={{ color: 'rgb(var(--c-text))' }}>{latencyMs}ms</span>
                </div>
              )}
              {lastCheckedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'rgb(var(--c-muted))' }}>Last checked</span>
                  <span className="text-[12px]" style={{ color: 'rgb(var(--c-text))' }}>
                    {lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {(aiState === 'offline' || aiState === 'waking') && (
              <div className="px-4 pb-3">
                {aiState === 'offline' ? (
                  <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--c-muted))' }}>
                    {llmCallError
                      ? `The AI engine is reachable but every AI request is currently failing: ${llmCallError}`
                      : 'Free-tier hosting spins the AI engine down after inactivity. Starting it now avoids getting a placeholder result on your next AI request.'}
                  </p>
                ) : (
                  <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--c-muted))' }}>
                    Cold boot in progress — usually 30-60 seconds.
                  </p>
                )}
                <button
                  onClick={handleWake}
                  disabled={aiState === 'waking'}
                  className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold py-2 rounded-xl transition-all disabled:opacity-60"
                  style={{ backgroundColor: '#7C3AED', color: 'white' }}
                >
                  {aiState === 'waking' ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting…</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Start AI Engine</>
                  )}
                </button>
              </div>
            )}

            {aiState === 'online' && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleWake}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-all"
                  style={{ color: 'rgb(var(--c-muted))', border: '1px solid rgb(var(--c-bord))' }}
                >
                  <RefreshCw className="w-3 h-3" /> Re-check now
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
