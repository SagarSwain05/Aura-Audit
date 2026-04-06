'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Bell, Menu, X, ChevronLeft, ChevronRight, LogOut, Settings,
  Home, FileSearch, Briefcase, Brain, TrendingUp, BarChart2, Trophy, Users,
  FileText, UserCircle, Building2, ClipboardList, PieChart, AlertTriangle,
  Upload, MapPin, CheckCircle, GraduationCap, UserCheck, Globe,
  Sun, Moon,
} from 'lucide-react'
import { useAuditStore } from '@/store/useAuditStore'
import { notificationsApi } from '@/lib/api'
import { io as socketIO } from 'socket.io-client'
import { useTheme } from '@/components/ThemeProvider'

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number }

const STUDENT_NAV: NavItem[] = [
  { href: '/student/home',         label: 'Home',           icon: Home },
  { href: '/student/assessments',  label: 'Assessments',    icon: Brain },
  { href: '/student/jobs',         label: 'Jobs',           icon: Briefcase },
  { href: '/student/career',       label: 'Career Path',    icon: TrendingUp },
  { href: '/student/skills',       label: 'Skills',         icon: BookOpen },
  { href: '/student/analytics',    label: 'Analytics',      icon: BarChart2 },
  { href: '/student/leaderboard',  label: 'Leaderboard',    icon: Trophy },
  { href: '/student/alumni',       label: 'Alumni Connect', icon: Users },
  { href: '/student/resume-builder', label: 'Resume Builder', icon: FileText },
  { href: '/student/profile',      label: 'Profile',        icon: UserCircle },
  { href: '/student/notifications', label: 'Notifications', icon: Bell },
  { href: '/student/settings',     label: 'Settings',       icon: Settings },
]

const COMPANY_NAV: NavItem[] = [
  { href: '/company/home',         label: 'Home',           icon: Home },
  { href: '/company/candidates',   label: 'Candidates',     icon: Users },
  { href: '/company/jobs',         label: 'Job Management', icon: Briefcase },
  { href: '/company/pipeline',     label: 'Hiring Pipeline',icon: ClipboardList },
  { href: '/company/ai-match',     label: 'AI Matching',    icon: Brain },
  { href: '/company/analytics',    label: 'Analytics',      icon: BarChart2 },
  { href: '/company/subscription', label: 'Subscription',   icon: CheckCircle },
  { href: '/company/kyc',          label: 'KYC Verification',icon: UserCheck },
  { href: '/company/profile',      label: 'Profile',        icon: Building2 },
  { href: '/company/settings',     label: 'Settings',       icon: Settings },
]

const TPO_NAV: NavItem[] = [
  { href: '/tpo/home',         label: 'Home',            icon: Home },
  { href: '/tpo/students',     label: 'Students',        icon: Users },
  { href: '/tpo/employability',label: 'Employability',   icon: PieChart },
  { href: '/tpo/intervention', label: 'Intervention',    icon: AlertTriangle },
  { href: '/tpo/upload',       label: 'Batch Upload',    icon: Upload },
  { href: '/tpo/placements',   label: 'Placements',      icon: MapPin },
  { href: '/tpo/companies',    label: 'Company Approval',icon: Building2 },
  { href: '/tpo/profile',      label: 'Profile',         icon: GraduationCap },
  { href: '/tpo/settings',     label: 'Settings',        icon: Settings },
]

const ROLE_NAV: Record<string, NavItem[]> = { student: STUDENT_NAV, company: COMPANY_NAV, tpo: TPO_NAV }
const ROLE_LABEL: Record<string, string> = { student: 'Student', company: 'Company', tpo: 'University / TPO' }

// Reusable icon button (theme-safe)
const IconBtn = ({ onClick, title, children, className = '' }: {
  onClick?: () => void; title?: string; children: React.ReactNode; className?: string
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{ color: 'rgb(var(--c-muted))' }}
    onMouseEnter={e => (e.currentTarget.style.color = 'rgb(var(--c-text))')}
    onMouseLeave={e => (e.currentTarget.style.color = 'rgb(var(--c-muted))')}
    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${className}`}
  >
    {children}
  </button>
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout, sidebarCollapsed, setSidebarCollapsed, notifications, setNotifications, unreadCount, setUnreadCount } = useAuditStore()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null)

  useEffect(() => { setHydrated(true) }, [])
  useEffect(() => { if (!hydrated) return; if (!user) router.push('/auth') }, [user, router, hydrated])

  useEffect(() => {
    if (!user) return
    notificationsApi.getAll().then((r) => {
      setNotifications(r.data.notifications || [])
      setUnreadCount(r.data.unreadCount || 0)
    }).catch(() => {})
  }, [user, setNotifications, setUnreadCount])

  useEffect(() => {
    if (!user) return
    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001', { transports: ['websocket'] })
    socketRef.current = socket
    socket.emit('join', user._id)
    socket.on('notification', (notif) => {
      setNotifications([notif, ...notifications])
      setUnreadCount(unreadCount + 1)
    })
    return () => { socket.disconnect() }
  }, [user]) // eslint-disable-line

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const role = user?.role || 'student'
  const navItems = ROLE_NAV[role] || STUDENT_NAV
  const handleLogout = () => { logout(); router.push('/auth') }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-aura-gradient flex items-center justify-center animate-pulse shadow-glow-purple">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex gap-1.5">
            {[0,150,300].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-aura-purple animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Inline style helpers — bypass Tailwind's compiled static values
  const sidebarStyle = { backgroundColor: 'rgb(var(--c-card))', borderColor: 'rgb(var(--c-bord))' }
  const hoverBg = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.06)' }, onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = '' } }

  const SidebarInner = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full" style={{ color: 'rgb(var(--c-text))' }}>

      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-3 py-3.5 border-b ${sidebarCollapsed && !mobile ? 'justify-center' : ''}`}
        style={{ borderColor: 'rgb(var(--c-bord))' }}
      >
        <Link href="/" className="w-8 h-8 rounded-lg bg-aura-gradient flex items-center justify-center flex-shrink-0 shadow-glow-purple hover:opacity-80 transition-opacity" title="Back to Homepage">
          <BookOpen className="w-4 h-4 text-white" />
        </Link>
        {(!sidebarCollapsed || mobile) && (
          <>
            <Link href="/" className="font-black text-[15px] hover:opacity-80 transition-opacity flex-1 truncate" style={{ color: 'rgb(var(--c-text))' }}>
              Aura<span className="gradient-text">-Audit</span>
            </Link>
            {!mobile && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'rgb(var(--c-muted))' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-text))'; e.currentTarget.style.backgroundColor = 'rgba(var(--c-bord),0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))'; e.currentTarget.style.backgroundColor = '' }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {mobile && (
              <button onClick={() => setMobileOpen(false)} className="ml-auto" style={{ color: 'rgb(var(--c-muted))' }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        )}
        {sidebarCollapsed && !mobile && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'rgb(var(--c-muted))' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-text))' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))' }}
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role pill */}
      {(!sidebarCollapsed || mobile) && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'rgb(var(--c-bord))' }}>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-muted))' }}>{ROLE_LABEL[role]}</span>
        </div>
      )}

      {/* Audit Resume shortcut */}
      {role === 'student' && (!sidebarCollapsed || mobile) && (
        <div className="px-3 py-2">
          <Link
            href="/upload"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#9F67FF' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.12)' }}
          >
            <FileSearch className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Audit Resume</span>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative ${
                sidebarCollapsed && !mobile ? 'justify-center px-0' : ''
              }`}
              style={active
                ? { backgroundColor: 'rgba(124,58,237,0.15)', color: '#9F67FF', border: '1px solid rgba(124,58,237,0.25)' }
                : { color: 'rgb(var(--c-muted))' }
              }
              onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.07)'; e.currentTarget.style.color = 'rgb(var(--c-text))' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(var(--c-muted))' } }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {(!sidebarCollapsed || mobile) && <span className="truncate">{item.label}</span>}
              {item.badge != null && item.badge > 0 && (!sidebarCollapsed || mobile) && (
                <span className="ml-auto text-[11px] bg-aura-purple text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-semibold">
                  {item.badge}
                </span>
              )}
              {sidebarCollapsed && !mobile && (
                <div
                  className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity"
                  style={{ backgroundColor: 'rgb(var(--c-card))', border: '1px solid rgb(var(--c-bord))', color: 'rgb(var(--c-text))' }}
                >
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className={`border-t p-3 ${sidebarCollapsed && !mobile ? 'flex flex-col items-center gap-2' : ''}`}
        style={{ borderColor: 'rgb(var(--c-bord))' }}
      >
        {sidebarCollapsed && !mobile ? (
          <>
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'rgb(var(--c-muted))' }} title="Homepage"
              onMouseEnter={e => { e.currentTarget.style.color = '#22D3EE' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))' }}
            >
              <Globe className="w-4 h-4" />
            </Link>
            <button onClick={handleLogout} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'rgb(var(--c-muted))' }} title="Logout"
              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href={`/${role}/profile`} className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity">
              <span className="text-[12px] font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--c-text))' }}>{user?.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'rgb(var(--c-muted))' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'rgb(var(--c-muted))' }} title="Logout"
              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))'; e.currentTarget.style.backgroundColor = '' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 border-r transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
        style={sidebarStyle}
      >
        <SidebarInner />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 border-r lg:hidden overflow-hidden"
              style={sidebarStyle}
            >
              <SidebarInner mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header
          className="h-14 border-b flex items-center px-3 sm:px-5 gap-3 flex-shrink-0 z-30 backdrop-blur-md"
          style={{ backgroundColor: 'rgb(var(--c-card) / 0.9)', borderColor: 'rgb(var(--c-bord))' }}
        >
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1" style={{ color: 'rgb(var(--c-muted))' }}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: 'rgb(var(--c-text))' }}>
              {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Dashboard'}
            </p>
          </div>

          {/* Homepage */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 transition-all"
            style={{ color: 'rgb(var(--c-muted))', border: '1px solid rgb(var(--c-bord))' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-text))'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))'; e.currentTarget.style.backgroundColor = '' }}
          >
            <Globe className="w-3.5 h-3.5" /> Homepage
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ border: '1px solid rgb(var(--c-bord))', backgroundColor: 'transparent', color: 'rgb(var(--c-muted))' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = 'rgb(var(--c-text))' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(var(--c-muted))' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4 text-aura-purple-light" />
            }
          </button>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'rgb(var(--c-muted))' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-text))'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-muted))'; e.currentTarget.style.backgroundColor = '' }}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-aura-purple rounded-full animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-72 sm:w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  style={{ backgroundColor: 'rgb(var(--c-card))', border: '1px solid rgb(var(--c-bord))' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgb(var(--c-bord))' }}>
                    <span className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text))' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => notificationsApi.markAllRead().then(() => { setNotifications(notifications.map((n) => ({ ...n, read: true }))); setUnreadCount(0) })}
                        className="text-[12px] text-aura-purple-light hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-[13px]" style={{ color: 'rgb(var(--c-muted))' }}>No notifications yet</div>
                    ) : notifications.slice(0, 10).map((n) => (
                      <div key={n._id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: 'rgb(var(--c-bord))', backgroundColor: !n.read ? 'rgba(124,58,237,0.04)' : '' }}>
                        <p className="text-[13px] font-medium" style={{ color: 'rgb(var(--c-text))' }}>{n.title}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--c-muted))' }}>{n.message}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--c-muted))' }}>{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t" style={{ borderColor: 'rgb(var(--c-bord))' }}>
                    <Link href={`/${role}/notifications`} onClick={() => setNotifOpen(false)} className="text-[12px] text-aura-purple-light hover:underline">
                      View all →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <Link href={`/${role}/profile`} className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity">
            <span className="text-[12px] font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
          </Link>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))', color: 'rgb(var(--c-text))' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
