'use client'

import { useState } from 'react'
import { Lock, Bell, Shield, Save, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'
import { useRouter } from 'next/navigation'

export default function CompanySettings() {
  const { logout } = useAuditStore()
  const router = useRouter()
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (passwords.newPwd !== passwords.confirm) return toast.error('Passwords do not match')
    setSaving(true)
    try {
      await api.put('/api/auth/password', { currentPassword: passwords.current, newPassword: passwords.newPwd })
      toast.success('Password updated!')
      setPasswords({ current: '', newPwd: '', confirm: '' })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-aura-purple-light" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="space-y-3">
          {[['current', 'Current Password'], ['newPwd', 'New Password'], ['confirm', 'Confirm']].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
              <input type="password" value={(passwords as Record<string, string>)[field]} onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })} className="input-field" />
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update Password
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold">Notifications</h2>
        </div>
        <p className="text-sm text-aura-muted">Email notifications for new applications and status updates are enabled by default.</p>
      </div>

      <div className="glass-card p-6 border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <button
          onClick={() => {
            if (!confirm('Delete company account permanently?')) return
            api.delete('/api/auth/account').then(() => { logout(); router.push('/') })
          }}
          className="flex items-center gap-2 text-sm text-red-400 border border-red-400/30 hover:border-red-400/50 px-4 py-2.5 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" /> Delete Company Account
        </button>
      </div>
    </div>
  )
}
