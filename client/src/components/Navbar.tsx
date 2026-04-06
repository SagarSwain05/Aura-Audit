'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Zap, User, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuditStore } from '@/store/useAuditStore'
import Cookies from 'js-cookie'

const NAV_LINKS = [
  { href: '/upload', label: 'Audit Resume' },
  { href: '/dashboard', label: 'Dashboard' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuditStore()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleLogout = () => {
    Cookies.remove('aura_token')
    logout()
  }

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-aura-bg/90 backdrop-blur-md border-b border-aura-border' : 'bg-transparent'
    }`}>
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-aura-gradient flex items-center justify-center shadow-glow-purple group-hover:scale-110 transition-transform">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg tracking-tight">
            Aura<span className="gradient-text">-Audit</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-aura-purple-light'
                  : 'text-aura-muted-light hover:text-aura-text'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-aura-muted-light hover:text-aura-text transition-colors">
                <div className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                {user.name.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="text-aura-muted hover:text-aura-red transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/auth" className="btn-secondary text-sm py-2">Sign In</Link>
              <Link href="/auth?tab=signup" className="btn-primary text-sm py-2">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-aura-muted" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-aura-surface border-b border-aura-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-aura-muted-light hover:text-aura-text py-2"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <button onClick={handleLogout} className="text-aura-red text-sm py-2">Log Out</button>
              ) : (
                <Link href="/auth" className="btn-primary block text-center" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
