'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuditStore } from '@/store/useAuditStore'

export default function UniversityRedirectPage() {
  const router = useRouter()
  const { user } = useAuditStore()

  useEffect(() => {
    if (user?.role === 'tpo') {
      router.replace('/tpo/home')
    } else {
      router.replace('/auth')
    }
  }, [user, router])

  return null
}
