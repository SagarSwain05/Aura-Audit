'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Save, Loader2 } from 'lucide-react'
import { companyApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    companyApi.getProfile().then((r) => {
      const c = r.data.company || {}
      setProfile({ name: c.name || '', industry: c.industry || '', website: c.website || '', location: c.location || '', about: c.about || '', size: c.size || '', phone: c.phone || '', socialLinks: c.socialLinks || { linkedin: '', twitter: '' } })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await companyApi.updateProfile(profile)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 skeleton h-64 rounded-2xl" />

  const socialLinks = profile.socialLinks as Record<string, string> || {}

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-aura-muted" />
        </div>
        <div>
          <p className="font-bold text-lg">{profile.name as string || 'Your Company'}</p>
          <p className="text-sm text-aura-muted">{profile.industry as string || 'Industry not set'}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['name', 'Company Name'],
            ['industry', 'Industry'],
            ['website', 'Website'],
            ['location', 'Location'],
            ['size', 'Company Size'],
            ['phone', 'Phone'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
              <input
                type="text"
                value={profile[field] as string || ''}
                onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                className="input-field"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-sm text-aura-muted-light mb-1.5 block">About</label>
          <textarea value={profile.about as string || ''} onChange={(e) => setProfile({ ...profile, about: e.target.value })} rows={4} className="input-field resize-none w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[['linkedin', 'LinkedIn'], ['twitter', 'Twitter']].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-aura-muted-light mb-1.5 block">{label} URL</label>
              <input
                type="url"
                value={socialLinks[field] || ''}
                onChange={(e) => setProfile({ ...profile, socialLinks: { ...socialLinks, [field]: e.target.value } })}
                placeholder="https://..."
                className="input-field"
              />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
