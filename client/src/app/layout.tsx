import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Aura-Audit — Auditing the past to engineer your future',
  description: 'AI-powered resume auditor and career matcher. Get your Aura Score, fix your resume with Gemini AI, and discover your ideal tech career path.',
  keywords: ['resume audit', 'ATS score', 'career matcher', 'AI resume', 'job matching', 'skills gap analysis'],
  openGraph: {
    title: 'Aura-Audit',
    description: 'Bridge the gap between your resume and your dream role.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" style={{ backgroundColor: 'var(--aura-bg)', color: 'var(--aura-text)' }}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--aura-card)',
                color: 'var(--aura-text)',
                border: '1px solid var(--aura-border)',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#10B981', secondary: 'var(--aura-card)' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: 'var(--aura-card)' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
