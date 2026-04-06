'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'
import toast from 'react-hot-toast'

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  job_update: 'bg-cyan-400/10 text-cyan-400',
  assessment: 'bg-aura-purple/10 text-aura-purple-light',
  achievement: 'bg-yellow-400/10 text-yellow-400',
  profile: 'bg-emerald-400/10 text-emerald-400',
  system: 'bg-white/5 text-aura-muted',
}

export default function NotificationsPage() {
  const { setUnreadCount } = useAuditStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationsApi.getAll().then((r) => {
      setNotifications(r.data?.notifications || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(Math.max(0, notifications.filter((n) => !n.read).length - 1))
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    toast.success('All marked as read')
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unread > 0 && <p className="text-aura-muted text-sm mt-1">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card p-4 flex items-start gap-4 ${!n.read ? 'border-white/10 bg-white/2' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.system}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-aura-purple flex-shrink-0" />}
                </div>
                <p className="text-xs text-aura-muted mt-0.5">{n.message}</p>
                <p className="text-xs text-aura-muted mt-1">{new Date(n.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex gap-1">
                {!n.read && (
                  <button onClick={() => handleRead(n._id)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-emerald-400 transition-colors" title="Mark read">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(n._id)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
