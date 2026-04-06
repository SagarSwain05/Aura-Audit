'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Edit2, Trash2, Eye, Loader2, Users, X } from 'lucide-react'
import { jobsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Job {
  _id: string
  title: string
  skills: string[]
  minCGPA?: number
  status: 'active' | 'draft' | 'closed'
  isDrive?: boolean
  createdAt: string
}

interface JobForm {
  title: string; description: string; location: string; skills: string
  minCGPA: string; isDrive: boolean; status: 'active' | 'draft'
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-400/10 text-emerald-400',
  draft: 'bg-yellow-400/10 text-yellow-400',
  closed: 'bg-red-400/10 text-red-400',
}

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<JobForm>({ title: '', description: '', location: '', skills: '', minCGPA: '', isDrive: false, status: 'active' })

  const load = () => jobsApi.getJobs().then((r) => setJobs(r.data.jobs || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.title) return toast.error('Job title is required')
    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        minCGPA: parseFloat(form.minCGPA) || 0,
        isDrive: form.isDrive,
        status: form.status,
      }
      if (editId) {
        await jobsApi.updateJob(editId, data)
        toast.success('Job updated!')
      } else {
        await jobsApi.createJob(data)
        toast.success('Job posted!')
      }
      setShowModal(false)
      setEditId(null)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job posting?')) return
    await jobsApi.deleteJob(id)
    setJobs((prev) => prev.filter((j) => j._id !== id))
    toast.success('Deleted')
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ title: '', description: '', location: '', skills: '', minCGPA: '', isDrive: false, status: 'active' })
    setShowModal(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Management</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Post Job
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted mb-3">No jobs posted yet</p>
          <button onClick={openCreate} className="btn-primary text-sm px-6 py-2">Post First Job</button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div key={job._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{job.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || ''}`}>{job.status}</span>
                  {job.isDrive && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">Campus Drive</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {job.skills.slice(0, 5).map((s) => <span key={s} className="px-2 py-0.5 text-xs bg-white/5 text-aura-muted rounded-lg">{s}</span>)}
                </div>
                <p className="text-xs text-aura-muted mt-1">{new Date(job.createdAt).toLocaleDateString()}{job.minCGPA ? ` · Min CGPA: ${job.minCGPA}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-cyan-400 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditId(job._id)
                    setForm({ title: job.title, description: '', location: '', skills: job.skills.join(', '), minCGPA: String(job.minCGPA || ''), isDrive: !!job.isDrive, status: job.status === 'closed' ? 'draft' : job.status })
                    setShowModal(true)
                  }}
                  className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(job._id)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? 'Edit Job' : 'Post New Job'}</h2>
              <button onClick={() => setShowModal(false)} className="text-aura-muted hover:text-aura-text"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {[['title', 'Job Title *', 'text', 'e.g. Frontend Engineer'],
                ['description', 'Description', 'text', 'Brief job description...'],
                ['location', 'Location', 'text', 'e.g. Bangalore / Remote'],
                ['skills', 'Required Skills', 'text', 'React, TypeScript, Node.js'],
                ['minCGPA', 'Min CGPA', 'number', '7.0'],
              ].map(([field, label, type, placeholder]) => (
                <div key={field}>
                  <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                  {field === 'description' ? (
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={placeholder} rows={3} className="input-field resize-none w-full text-sm" />
                  ) : (
                    <input type={type} value={(form as unknown as Record<string, string>)[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder} className="input-field" />
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDrive} onChange={(e) => setForm({ ...form, isDrive: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm">Campus Drive</span>
                </label>
                <div className="ml-auto flex gap-2">
                  {(['active', 'draft'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${form.status === s ? STATUS_COLORS[s] + ' border border-current' : 'bg-white/5 text-aura-muted'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editId ? 'Update' : 'Post Job'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
