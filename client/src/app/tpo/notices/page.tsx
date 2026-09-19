'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Plus, Pin, Trash2, Edit2, Loader2, X, Calendar, Building2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'

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

const TYPES: { value: Notice['type']; label: string }[] = [
  { value: 'placement_drive', label: 'Placement Drive' },
  { value: 'workshop', label: 'Workshop / Live Session' },
  { value: 'mock_test', label: 'Mock Test' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'general', label: 'General' },
]

const emptyForm = { title: '', message: '', type: 'general' as Notice['type'], company: '', eventDate: '', link: '', pinned: false }

export default function TPONoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    universityApi.getNotices().then((r) => setNotices(r.data.notices || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (n: Notice) => {
    setForm({
      title: n.title, message: n.message, type: n.type, company: n.company || '',
      eventDate: n.eventDate ? n.eventDate.slice(0, 10) : '', link: n.link || '', pinned: n.pinned,
    })
    setEditingId(n._id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, eventDate: form.eventDate || undefined }
      if (editingId) {
        await universityApi.updateNotice(editingId, payload)
        toast.success('Notice updated')
      } else {
        await universityApi.createNotice(payload)
        toast.success('Notice posted — students notified')
      }
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to save notice')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notice?')) return
    setDeletingId(id)
    try {
      await universityApi.deleteNotice(id)
      setNotices((prev) => prev.filter((n) => n._id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Board</h1>
          <p className="text-aura-muted text-sm mt-1">Placement drives, workshops, deadlines — visible only to students affiliated with your institution.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Notice
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : notices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted mb-3">No notices posted yet</p>
          <button onClick={openCreate} className="btn-primary text-sm px-6 py-2">Post Your First Notice</button>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <motion.div key={n._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.pinned && <Pin className="w-3.5 h-3.5 text-aura-purple-light" />}
                    <p className="font-semibold text-sm">{n.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-aura-muted">{TYPES.find(t => t.value === n.type)?.label}</span>
                  </div>
                  <p className="text-xs text-aura-muted mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-aura-muted flex-wrap">
                    {n.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{n.company}</span>}
                    {n.eventDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(n.eventDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(n)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(n._id)} disabled={deletingId === n._id} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-red-400">
                    {deletingId === n._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Notice' : 'New Notice'}</h2>
              <button onClick={() => setShowForm(false)} className="text-aura-muted hover:text-aura-text"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-aura-muted mb-1 block">Title</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field text-sm w-full" placeholder="TCS Campus Drive — Registrations Open" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-aura-muted mb-1 block">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Notice['type'] }))} className="input-field text-sm w-full">
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-aura-muted mb-1 block">Event/Deadline Date</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} className="input-field text-sm w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-aura-muted mb-1 block">Company (optional)</label>
                <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="input-field text-sm w-full" placeholder="TCS" />
              </div>
              <div>
                <label className="text-xs text-aura-muted mb-1 block">Message</label>
                <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value.slice(0, 3000) }))} rows={4} className="input-field text-sm w-full resize-none" placeholder="Details students need to know..." />
              </div>
              <div>
                <label className="text-xs text-aura-muted mb-1 block">Link (optional — registration form, meeting link, etc.)</label>
                <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="input-field text-sm w-full" placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4" />
                Pin to top
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 text-sm px-4 py-2 rounded-xl bg-white/5 text-aura-muted hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Save Changes' : 'Post Notice'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
