'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuditStore } from '@/store/useAuditStore'

export default function DashboardRedirect() {
  const router = useRouter()
  const { user } = useAuditStore()

  useEffect(() => {
    if (!user) { router.replace('/auth'); return }
    const map: Record<string, string> = { student: '/student/home', company: '/company/home', tpo: '/tpo/home' }
    router.replace(map[user.role] || '/student/home')
  }, [user, router])

  return (
    <div className="min-h-screen bg-aura-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-aura-purple border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
