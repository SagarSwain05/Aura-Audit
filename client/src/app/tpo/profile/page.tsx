'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Save, Loader2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function TPOProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    universityApi.getProfile().then((r) => {
      const u = r.data.university || {}
      setProfile({
        name: u.name || '',
        location: u.location || '',
        tpoContact: u.tpoContact || '',
        tpoEmail: u.tpoEmail || '',
        batchYear: u.batchYear || new Date().getFullYear(),
      })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await universityApi.updateProfile(profile)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 skeleton h-64 rounded-2xl" />

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">University Profile</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-aura-purple/20 flex items-center justify-center">
          <GraduationCap className="w-8 h-8 text-aura-purple-light" />
        </div>
        <div>
          <p className="font-bold text-lg">{profile.name as string || 'University Name'}</p>
          <p className="text-sm text-aura-muted">{profile.location as string || 'Location not set'}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
        {[
          ['name', 'University Name', 'text'],
          ['location', 'Location (City, State)', 'text'],
          ['tpoContact', 'TPO Contact Person', 'text'],
          ['tpoEmail', 'TPO Email', 'email'],
          ['batchYear', 'Current Batch Year', 'number'],
        ].map(([field, label, type]) => (
          <div key={field}>
            <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
            <input
              type={type}
              value={profile[field as string] as string || ''}
              onChange={(e) => setProfile({ ...profile, [field as string]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
              className="input-field"
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}
