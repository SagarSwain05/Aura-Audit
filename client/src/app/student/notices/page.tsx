'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Pin, Calendar, ExternalLink, Building2, Loader2, Bell } from 'lucide-react'
import { studentApi } from '@/lib/api'
import Link from 'next/link'

interface Notice {
  _id: string
  title: string
  message: string
  type: 'placement_drive' | 'workshop' | 'mock_test' | 'deadline' | 'general'
  company?: string
  eventDate?: string
  link?: string
  pinned: boolean
  createdAt: string
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  placement_drive: { label: 'Placement Drive', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  workshop: { label: 'Workshop', color: 'bg-aura-purple/10 text-aura-purple-light border-aura-purple/20' },
  mock_test: { label: 'Mock Test', color: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
  deadline: { label: 'Deadline', color: 'bg-red-400/10 text-red-400 border-red-400/20' },
  general: { label: 'General', color: 'bg-white/5 text-aura-muted border-white/10' },
}

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUniversity, setHasUniversity] = useState(true)

  useEffect(() => {
    studentApi.getProfile().then((r) => {
      if (!r.data.student?.university) setHasUniversity(false)
    })
    studentApi.getNotices()
      .then((r) => setNotices(r.data.notices || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">Placement Notices</h1>
        <p className="text-aura-muted text-sm mt-1">Announcements from your college/university&apos;s placement cell.</p>
      </div>

      {!hasUniversity && (
        <div className="glass-card p-6 text-center border-amber-500/30">
          <p className="text-amber-400 text-sm mb-3">Set your college/university to see its placement notices.</p>
          <Link href="/student/college" className="btn-primary text-sm px-5 py-2 inline-block">
            Set My University
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-aura-purple" /></div>
      ) : hasUniversity && notices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No notices yet — your placement cell hasn&apos;t posted anything.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n, i) => {
            const meta = TYPE_META[n.type] || TYPE_META.general
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className={`glass-card p-5 ${n.pinned ? 'border-aura-purple/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.pinned && <Pin className="w-3.5 h-3.5 text-aura-purple-light" />}
                    <h3 className="font-semibold text-sm">{n.title}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${meta.color}`}>{meta.label}</span>
                </div>
                <p className="text-sm text-aura-muted-light whitespace-pre-wrap">{n.message}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-aura-muted flex-wrap">
                  {n.company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {n.company}</span>}
                  {n.eventDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(n.eventDate).toLocaleDateString()}</span>}
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  {n.link && (
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-aura-purple-light hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> Link
                    </a>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
