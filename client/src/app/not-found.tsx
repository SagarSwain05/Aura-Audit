import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-aura-bg flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-aura-muted mb-6">This page doesn't exist or has been moved.</p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
