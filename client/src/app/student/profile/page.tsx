'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { studentApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'
import toast from 'react-hot-toast'

interface StudentProfile {
  name: string; email: string; phone: string; bio: string; location: string
  department: string; rollNumber: string; year: number; semester: number; cgpa: number
  dreamRole: string; profilePic: string
  socialLinks: { linkedin: string; github: string; portfolio: string; twitter: string }
  certifications: { _id: string; name: string; issuer: string; issueDate: string; credentialUrl: string }[]
  projects: { _id: string; title: string; description: string; techStack: string[]; githubUrl: string; liveUrl: string }[]
}

export default function StudentProfilePage() {
  const { user } = useAuditStore()
  const [profile, setProfile] = useState<Partial<StudentProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('basic')

  useEffect(() => {
    studentApi.getProfile().then((r) => {
      const s = r.data.student
      setProfile({
        name: s.name || user?.name || '',
        email: s.email || user?.email || '',
        phone: s.phone || '',
        bio: s.bio || '',
        location: s.location || '',
        department: s.department || '',
        rollNumber: s.rollNumber || '',
        year: s.year || 1,
        semester: s.semester || 1,
        cgpa: s.cgpa || 0,
        dreamRole: s.dreamRole || '',
        socialLinks: s.socialLinks || { linkedin: '', github: '', portfolio: '', twitter: '' },
        certifications: s.certifications || [],
        projects: s.projects || [],
      })
    }).finally(() => setLoading(false))
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await studentApi.updateProfile(profile)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'academic', label: 'Academic' },
    { id: 'social', label: 'Links' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'projects', label: 'Projects' },
  ]

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="skeleton h-10 w-48 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Avatar */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-aura-gradient flex items-center justify-center text-white text-3xl font-black">
          {profile.name?.charAt(0) || <User className="w-8 h-8" />}
        </div>
        <div>
          <p className="font-bold text-lg">{profile.name}</p>
          <p className="text-sm text-aura-muted">{profile.email}</p>
          <button className="mt-2 text-xs text-aura-purple-light hover:underline flex items-center gap-1">
            <Upload className="w-3 h-3" /> Upload Photo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-aura-gradient text-white' : 'text-aura-muted hover:text-aura-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        {tab === 'basic' && (
          <>
            {[
              ['name', 'Full Name', 'text'],
              ['phone', 'Phone', 'tel'],
              ['location', 'Location', 'text'],
              ['dreamRole', 'Dream Role', 'text'],
            ].map(([field, label, type]) => (
              <div key={field}>
                <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                <input
                  type={type}
                  value={(profile as Record<string, unknown>)[field] as string || ''}
                  onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                  className="input-field"
                />
              </div>
            ))}
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Bio</label>
              <textarea
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                maxLength={500}
                className="input-field resize-none w-full"
              />
            </div>
          </>
        )}

        {tab === 'academic' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              ['department', 'Department', 'text'],
              ['rollNumber', 'Roll Number', 'text'],
              ['year', 'Current Year', 'number'],
              ['semester', 'Semester', 'number'],
              ['cgpa', 'CGPA', 'number'],
            ].map(([field, label, type]) => (
              <div key={field}>
                <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                <input
                  type={type}
                  value={(profile as Record<string, unknown>)[field] as string || ''}
                  onChange={(e) => setProfile({ ...profile, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                  step={type === 'number' ? '0.01' : undefined}
                  className="input-field"
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'social' && (
          <>
            {[
              ['linkedin', 'LinkedIn URL'],
              ['github', 'GitHub URL'],
              ['portfolio', 'Portfolio URL'],
              ['twitter', 'Twitter URL'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                <input
                  type="url"
                  value={profile.socialLinks?.[field as keyof typeof profile.socialLinks] || ''}
                  onChange={(e) => setProfile({ ...profile, socialLinks: { ...(profile.socialLinks || {}), [field]: e.target.value } as typeof profile.socialLinks })}
                  placeholder="https://..."
                  className="input-field"
                />
              </div>
            ))}
          </>
        )}

        {tab === 'certifications' && (
          <div className="space-y-3">
            {(profile.certifications || []).map((cert, i) => (
              <div key={cert._id || i} className="p-3 bg-white/5 rounded-xl">
                <div className="grid grid-cols-2 gap-2">
                  {[['name', 'Certificate Name'], ['issuer', 'Issuer']].map(([field, label]) => (
                    <div key={field}>
                      <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                      <input type="text" value={(cert as Record<string, string>)[field] || ''} className="input-field text-sm" readOnly />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    studentApi.removeCertification(cert._id).then(() => {
                      setProfile({ ...profile, certifications: profile.certifications?.filter((_, j) => j !== i) })
                      toast.success('Removed')
                    })
                  }}
                  className="mt-2 text-xs text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            ))}
            <p className="text-xs text-aura-muted">Add certifications via the Assessments page after passing</p>
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-3">
            {(profile.projects || []).map((proj, i) => (
              <div key={proj._id || i} className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{proj.title || 'Untitled'}</p>
                    <p className="text-xs text-aura-muted mt-0.5">{proj.techStack?.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      studentApi.removeProject(proj._id).then(() => {
                        setProfile({ ...profile, projects: profile.projects?.filter((_, j) => j !== i) })
                        toast.success('Removed')
                      })
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-aura-muted mt-1">{proj.description}</p>
              </div>
            ))}
            <p className="text-xs text-aura-muted">Projects can be added via the Resume Builder</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
