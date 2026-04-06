'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/student/home') }, [router])
  return <div className="min-h-screen bg-aura-bg" />
}
