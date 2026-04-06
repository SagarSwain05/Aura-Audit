'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Loader2, GraduationCap, Building2, University } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'

type Role = 'student' | 'company' | 'tpo'

const ROLES = [
  { id: 'student' as Role, label: 'Student', icon: GraduationCap, desc: 'Track your career journey' },
  { id: 'company' as Role, label: 'Company', icon: Building2, desc: 'Find top talent' },
  { id: 'tpo' as Role, label: 'University / TPO', icon: University, desc: 'Manage placements' },
]

const ROLE_REDIRECTS: Record<Role, string> = {
  student: '/student/home',
  company: '/company/home',
  tpo: '/tpo/home',
}

function AuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setUser, setToken, user } = useAuditStore()

  const [tab, setTab] = useState<'login' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  )
  const [role, setRole] = useState<Role>('student')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', dreamRole: '', universityName: '', companyName: '',
  })

  // If already logged in, redirect to dashboard
  useEffect(() => {
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (hydrated && user) {
      router.replace(ROLE_REDIRECTS[user.role as Role] || '/student/home')
    }
  }, [hydrated, user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let res
      if (tab === 'signup') {
        res = await authApi.register({ ...form, role })
      } else {
        res = await authApi.login({ email: form.email, password: form.password })
      }
      const { token, user } = res.data
      setToken(token)
      setUser(user)
      toast.success(`Welcome${tab === 'signup' ? ', ' + user.name : ' back'}!`)
      const userRole = user.role as Role
      router.push(ROLE_REDIRECTS[userRole] || '/upload')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-aura-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-aura-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-aura-gradient flex items-center justify-center shadow-glow-purple">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl">Aura<span className="gradient-text">-Audit</span></span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">
            {tab === 'login' ? 'Welcome back' : 'Start your journey'}
          </h1>
          <p className="text-aura-muted text-sm">
            {tab === 'login' ? 'Sign in to your account' : 'Free account. No credit card.'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="glass-card p-1 flex mb-4">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t ? 'bg-aura-gradient text-white shadow-glow-purple' : 'text-aura-muted hover:text-aura-text'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Role selector (signup only) */}
        <AnimatePresence>
          {tab === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`glass-card p-3 flex flex-col items-center gap-1.5 text-center transition-all duration-200 ${
                      role === r.id
                        ? 'border-aura-purple shadow-glow-purple'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <r.icon className={`w-5 h-5 ${role === r.id ? 'text-aura-purple-light' : 'text-aura-muted'}`} />
                    <span className={`text-xs font-semibold ${role === r.id ? 'text-aura-text' : 'text-aura-muted'}`}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Full Name</label>
              <input name="name" type="text" placeholder="Your name" value={form.name} onChange={handleChange} required className="input-field" />
            </div>
          )}

          <div>
            <label className="text-sm text-aura-muted-light mb-1.5 block">Email</label>
            <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required className="input-field" />
          </div>

          <div>
            <label className="text-sm text-aura-muted-light mb-1.5 block">Password</label>
            <div className="relative">
              <input name="password" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} className="input-field pr-10" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-aura-muted hover:text-aura-text">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'signup' && role === 'student' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Dream Role <span className="text-aura-muted">(optional)</span></label>
              <input name="dreamRole" type="text" placeholder="e.g. ML Engineer, DevOps" value={form.dreamRole} onChange={handleChange} className="input-field" />
            </div>
          )}

          {tab === 'signup' && role === 'company' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Company Name</label>
              <input name="companyName" type="text" placeholder="e.g. Infosys, TCS" value={form.companyName} onChange={handleChange} required className="input-field" />
            </div>
          )}

          {tab === 'signup' && role === 'tpo' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">University Name</label>
              <input name="universityName" type="text" placeholder="e.g. NIT Rourkela" value={form.universityName} onChange={handleChange} required className="input-field" />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {tab === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-aura-muted text-sm mt-4">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setTab(tab === 'login' ? 'signup' : 'login')} className="text-aura-purple-light hover:underline font-medium">
            {tab === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-aura-bg" />}>
      <AuthForm />
    </Suspense>
  )
}
