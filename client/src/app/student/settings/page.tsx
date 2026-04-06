'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Bell, Eye, Trash2, Save, Loader2, Lock, Key, CheckCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'
import { useRouter } from 'next/navigation'

export default function StudentSettings() {
  const { logout } = useAuditStore()
  const router = useRouter()
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [userGeminiKey, setUserGeminiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saved' | 'cleared'>('idle')
  const [notifPrefs, setNotifPrefs] = useState({
    jobUpdates: true,
    assessmentReminders: true,
    weeklyReport: false,
    achievements: true,
  })

  useEffect(() => {
    const saved = localStorage.getItem('aura_gemini_key') || ''
    setUserGeminiKey(saved)
    if (saved) setKeyStatus('saved')
  }, [])

  const handleChangePassword = async () => {
    if (passwords.newPwd !== passwords.confirm) return toast.error('Passwords do not match')
    if (passwords.newPwd.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      await api.put('/api/auth/password', { currentPassword: passwords.current, newPassword: passwords.newPwd })
      toast.success('Password updated!')
      setPasswords({ current: '', newPwd: '', confirm: '' })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGeminiKey = () => {
    const key = userGeminiKey.trim()
    if (!key) return toast.error('Enter a valid API key')
    if (!key.startsWith('AIza')) return toast.error('Gemini keys start with "AIza..."')
    localStorage.setItem('aura_gemini_key', key)
    setKeyStatus('saved')
    toast.success('Your Gemini key saved — AI features will use it first!')
  }

  const handleClearGeminiKey = () => {
    localStorage.removeItem('aura_gemini_key')
    setUserGeminiKey('')
    setKeyStatus('cleared')
    toast.success('Key cleared — using platform keys')
  }

  const handleDeleteAccount = () => {
    if (!confirm('Are you sure? This action is permanent and cannot be undone.')) return
    api.delete('/api/auth/account').then(() => {
      logout()
      router.push('/')
      toast.success('Account deleted')
    }).catch(() => toast.error('Failed to delete account'))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Your AI Key */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-aura-purple/30">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-aura-purple-light" />
          <h2 className="font-semibold">Your Personal Gemini API Key</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-aura-purple/20 text-aura-purple-light ml-1">Optional</span>
        </div>
        <p className="text-xs text-aura-muted mb-4">
          Add your own free Gemini key from{' '}
          <span className="text-aura-purple-light">aistudio.google.com</span>.
          It will be used first for all AI features (Live Jobs matching, resume audit, etc.),
          giving you higher rate limits. Stored only in your browser — never sent to our servers directly.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="AIzaSy..."
            value={userGeminiKey}
            onChange={(e) => { setUserGeminiKey(e.target.value); setKeyStatus('idle') }}
            className="input-field flex-1 font-mono text-sm"
          />
          <button onClick={handleSaveGeminiKey} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5 shrink-0">
            <Save className="w-4 h-4" /> Save
          </button>
          {keyStatus === 'saved' && (
            <button onClick={handleClearGeminiKey} title="Clear key" className="px-3 py-2.5 rounded-xl border border-white/10 hover:border-red-400/40 text-aura-muted hover:text-red-400 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {keyStatus === 'saved' && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Key active — your AI requests get priority quota
          </div>
        )}
        {keyStatus === 'cleared' && (
          <p className="text-xs text-aura-muted mt-3">Using platform keys with automatic rotation</p>
        )}

        <div className="mt-4 p-3 rounded-xl bg-white/5 text-xs text-aura-muted space-y-1">
          <p className="font-medium text-white/70 mb-1.5">How the fallback chain works:</p>
          <p>1. <span className="text-aura-purple-light">Your key</span> → used first (your quota)</p>
          <p>2. <span className="text-cyan-400">Platform key pool</span> → 4 Gemini keys, round-robin</p>
          <p>3. <span className="text-yellow-400">Groq Llama 3.3-70b</span> → fallback if all Gemini keys rate-limited</p>
        </div>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-aura-purple-light" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="space-y-3">
          {[
            ['current', 'Current Password'],
            ['newPwd', 'New Password'],
            ['confirm', 'Confirm Password'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
              <input
                type="password"
                value={(passwords as Record<string, string>)[field]}
                onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                className="input-field"
              />
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5 mt-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update Password
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold">Notification Preferences</h2>
        </div>
        <div className="space-y-3">
          {[
            ['jobUpdates', 'Job application updates'],
            ['assessmentReminders', 'Assessment reminders'],
            ['weeklyReport', 'Weekly progress report'],
            ['achievements', 'Achievement badges'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <button
                onClick={() => setNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key as keyof typeof notifPrefs] })}
                className={`w-11 h-6 rounded-full transition-all relative ${notifPrefs[key as keyof typeof notifPrefs] ? 'bg-aura-purple' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[key as keyof typeof notifPrefs] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Privacy */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold">Privacy</h2>
        </div>
        <p className="text-sm text-aura-muted">Your profile is visible to verified companies and your university TPO.</p>
        <p className="text-sm text-aura-muted mt-2">To opt out of company visibility, contact your university admin.</p>
      </motion.div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-aura-muted mb-4">Deleting your account is permanent. All data including assessments, audits, and career points will be lost.</p>
        <button onClick={handleDeleteAccount} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/50 px-4 py-2.5 rounded-xl transition-all">
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </motion.div>
    </div>
  )
}
