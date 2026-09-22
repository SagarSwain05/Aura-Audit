'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { statusApi } from '@/lib/api'

export type AiEngineState = 'checking' | 'online' | 'offline' | 'waking'

interface SystemStatus {
  aiState: AiEngineState
  serverOnline: boolean
  latencyMs: number | null
  lastCheckedAt: Date | null
  // Explicitly wakes the AI engine (long timeout) and waits for a real
  // result — used by the "Start AI Engine" button, distinct from the
  // silent best-effort nudge AIWakeup fires on every page load.
  wake: () => Promise<void>
}

const POLL_INTERVAL_MS = 45_000

export function useSystemStatus(): SystemStatus {
  const [aiState, setAiState] = useState<AiEngineState>('checking')
  const [serverOnline, setServerOnline] = useState(true)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const wakingRef = useRef(false)

  const check = useCallback(async () => {
    if (wakingRef.current) return // don't let a background poll clobber an in-progress wake
    try {
      const res = await statusApi.get(false)
      setServerOnline(true)
      setAiState(res.data.aiEngine?.status === 'online' ? 'online' : 'offline')
      setLatencyMs(res.data.aiEngine?.latencyMs ?? null)
      setLastCheckedAt(new Date())
    } catch {
      // The server itself didn't respond — that's a bigger problem than the
      // AI engine being cold, and it's a distinct state so the UI doesn't
      // tell someone to "start the AI engine" when the backend is the issue.
      setServerOnline(false)
      setAiState('offline')
      setLastCheckedAt(new Date())
    }
  }, [])

  const wake = useCallback(async () => {
    wakingRef.current = true
    setAiState('waking')
    try {
      const res = await statusApi.get(true)
      setServerOnline(true)
      setAiState(res.data.aiEngine?.status === 'online' ? 'online' : 'offline')
      setLatencyMs(res.data.aiEngine?.latencyMs ?? null)
      setLastCheckedAt(new Date())
    } catch {
      setServerOnline(false)
      setAiState('offline')
      setLastCheckedAt(new Date())
    } finally {
      wakingRef.current = false
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [check])

  return { aiState, serverOnline, latencyMs, lastCheckedAt, wake }
}
