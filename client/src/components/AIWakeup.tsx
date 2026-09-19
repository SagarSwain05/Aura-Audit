'use client'

import { useEffect } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

/**
 * Fires a fire-and-forget nudge to wake the AI engine as early as possible
 * in a session — mounted in the root layout so it runs on every page load
 * (landing, auth, dashboard), not just when a user reaches an AI feature.
 * A sleeping AI engine takes ~30-60s to cold-boot; starting that boot while
 * the user is still navigating around means it's often warm by the time
 * they actually submit a resume or request an assessment.
 */
export default function AIWakeup() {
  useEffect(() => {
    fetch(`${BASE}/api/wake-ai`, { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
