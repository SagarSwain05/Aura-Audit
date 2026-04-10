'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Loader2, GraduationCap, Building2, University, Mail, RotateCcw, KeyRound } from 'lucide-react'
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

  // OTP verification step (signup)
  const [otpStep, setOtpStep] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState<'off' | 'email' | 'reset'>('off')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotCooldown, setForgotCooldown] = useState(0)

  useEffect(() => { setHydrated(true) }, [])
  useEffect(() => {
    if (hydrated && user) {
      router.replace(ROLE_REDIRECTS[user.role as Role] || '/student/home')
    }
  }, [hydrated, user, router])

  // Resend cooldown timers
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (forgotCooldown <= 0) return
    const t = setInterval(() => setForgotCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [forgotCooldown])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(form.email)) {
      toast.error('Please enter a valid email address (e.g. you@example.com)')
      return
    }
    if (tab === 'signup' && form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      let res
      if (tab === 'signup') {
        res = await authApi.register({ ...form, role })
        if (res.data.pendingVerification) {
          setPendingEmail(form.email)
          setOtpStep(true)
          setResendCooldown(60)
          toast.success('Check your email for the verification code!')
          return
        }
      } else {
        res = await authApi.login({ email: form.email, password: form.password })
        const { token, user: loggedUser } = res.data
        setToken(token)
        setUser(loggedUser)
        toast.success('Welcome back!')
        const userRole = loggedUser.role as Role
        router.push(ROLE_REDIRECTS[userRole] || '/upload')
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.verifyEmail({ email: pendingEmail, otp })
      const { token, user: verifiedUser } = res.data
      setToken(token)
      setUser(verifiedUser)
      toast.success('Email verified! Welcome to Aura-Audit 🎉')
      const userRole = verifiedUser.role as Role
      router.push(ROLE_REDIRECTS[userRole] || '/upload')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await authApi.resendOTP({ email: pendingEmail })
      toast.success('New code sent to your email!')
      setResendCooldown(60)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(forgotEmail)) { toast.error('Enter a valid email address'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: forgotEmail })
      toast.success('If that email is registered, a reset code has been sent.')
      setForgotStep('reset')
      setForgotCooldown(60)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotResend = async () => {
    if (forgotCooldown > 0) return
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: forgotEmail })
      toast.success('New reset code sent!')
      setForgotCooldown(60)
    } catch {
      toast.error('Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (forgotOtp.length !== 6) { toast.error('Enter the 6-digit code'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authApi.resetPassword({ email: forgotEmail, otp: forgotOtp, newPassword })
      toast.success('Password reset! You can now sign in.')
      setForgotStep('off')
      setForgotEmail(''); setForgotOtp(''); setNewPassword(''); setConfirmPassword('')
      setTab('login')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP verification screen ───────────────────────────────────────────────
  if (otpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-aura-purple/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-aura-gradient flex items-center justify-center shadow-glow-purple">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">Aura<span className="gradient-text">-Audit</span></span>
            </Link>
            <div className="w-16 h-16 rounded-2xl bg-aura-purple/15 border border-aura-purple/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-aura-purple-light" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>Check your email</h1>
            <p className="text-aura-muted text-sm">
              We sent a 6-digit code to <span className="text-aura-text font-medium">{pendingEmail}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} className="glass-card p-6 space-y-5">
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input-field text-center text-2xl font-bold tracking-[0.5em] py-4"
                autoFocus
              />
              <p className="text-xs text-aura-muted mt-1.5">Code expires in 10 minutes</p>
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Verify Email <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtp('') }}
                className="text-sm text-aura-muted hover:text-aura-text transition-colors"
              >
                ← Back to signup
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                className="flex items-center gap-1.5 text-sm text-aura-purple-light hover:underline disabled:opacity-50 disabled:no-underline transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )
  }

  // ── Forgot password: enter email ─────────────────────────────────────────
  if (forgotStep === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-aura-purple/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-aura-gradient flex items-center justify-center shadow-glow-purple">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">Aura<span className="gradient-text">-Audit</span></span>
            </Link>
            <div className="w-16 h-16 rounded-2xl bg-aura-purple/15 border border-aura-purple/30 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-aura-purple-light" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>Forgot password?</h1>
            <p className="text-aura-muted text-sm">Enter your email and we'll send a reset code.</p>
          </div>
          <form onSubmit={handleForgotSendCode} className="glass-card p-6 space-y-4">
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Email</label>
              <input
                type="email" placeholder="you@example.com" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)} required
                className="input-field" autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Send Reset Code</>}
            </button>
            <button type="button" onClick={() => setForgotStep('off')} className="w-full text-center text-sm text-aura-muted hover:text-aura-text transition-colors pt-1">
              ← Back to sign in
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  // ── Forgot password: enter code + new password ────────────────────────────
  if (forgotStep === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-aura-purple/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-aura-gradient flex items-center justify-center shadow-glow-purple">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">Aura<span className="gradient-text">-Audit</span></span>
            </Link>
            <div className="w-16 h-16 rounded-2xl bg-aura-purple/15 border border-aura-purple/30 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-aura-purple-light" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>Set new password</h1>
            <p className="text-aura-muted text-sm">
              Enter the code sent to <span className="text-aura-text font-medium">{forgotEmail}</span>
            </p>
          </div>
          <form onSubmit={handleResetPassword} className="glass-card p-6 space-y-4">
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Reset Code</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" autoFocus
                className="input-field text-center text-2xl font-bold tracking-[0.5em] py-4"
              />
            </div>
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">New Password</label>
              <input type="password" placeholder="Min 8 characters" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} minLength={8} className="input-field" />
            </div>
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Confirm Password</label>
              <input type="password" placeholder="Same as above" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" />
            </div>
            <button type="submit" disabled={loading || forgotOtp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4" /> Reset Password</>}
            </button>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setForgotStep('email')} className="text-sm text-aura-muted hover:text-aura-text transition-colors">
                ← Change email
              </button>
              <button type="button" onClick={handleForgotResend} disabled={forgotCooldown > 0 || loading}
                className="flex items-center gap-1.5 text-sm text-aura-purple-light hover:underline disabled:opacity-50 disabled:no-underline transition-all">
                <RotateCcw className="w-3.5 h-3.5" />
                {forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )
  }

  // ── Main auth form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-aura-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-aura-gradient flex items-center justify-center shadow-glow-purple">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl">Aura<span className="gradient-text">-Audit</span></span>
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-aura-muted-light">Password</label>
              {tab === 'login' && (
                <button type="button" onClick={() => { setForgotStep('email'); setForgotEmail(form.email) }}
                  className="text-xs text-aura-purple-light hover:underline">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={handleChange} required minLength={8} className="input-field pr-10" />
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

          {tab === 'signup' && (
            <p className="text-xs text-aura-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-aura-purple-light" />
              A verification code will be sent to your email
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {tab === 'login' ? 'Sign In' : 'Send Verification Code'}
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
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--c-bg))' }} />}>
      <AuthForm />
    </Suspense>
  )
}
