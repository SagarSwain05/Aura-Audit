'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Zap, Target, Map, Star, TrendingUp, Shield, Users, ChevronRight, Sparkles, BarChart3, Brain, Layers } from 'lucide-react'
import Navbar from '@/components/Navbar'

const FEATURES = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'AI Resume Auditor',
    description: 'Grammarly-style redlines powered by Gemini. Fix weak verbs, missing metrics, and ATS gaps in seconds.',
    gradient: 'from-purple-500 to-violet-600',
    glow: 'shadow-[0_0_30px_rgba(124,58,237,0.2)]',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Career Matcher',
    description: 'Semantic skill analysis matches you to the top 3 roles you\'re 80%+ ready for today, with salary data.',
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: 'Gap Analysis 2.0',
    description: '30-day personalized learning roadmaps with YouTube & Coursera resources to bridge your skill gaps.',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Interview Simulator',
    description: '5 AI-generated questions based strictly on YOUR projects — not generic questions.',
    gradient: 'from-orange-500 to-red-600',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.2)]',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Market Demand Pulse',
    description: 'Real-time hiring temperature for your skills in Bangalore, Hyderabad, London, and New York.',
    gradient: 'from-pink-500 to-rose-600',
    glow: 'shadow-[0_0_30px_rgba(236,72,153,0.2)]',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Blind Hiring Mode',
    description: 'Remove name, gender and location from your resume automatically to promote fair hiring.',
    gradient: 'from-amber-500 to-yellow-600',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
  },
]

const STATS = [
  { value: '10K+', label: 'Resumes Audited' },
  { value: '94%', label: 'ATS Pass Rate' },
  { value: '3.2x', label: 'Interview Rate Boost' },
  { value: '50+', label: 'Job Profiles' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Upload your PDF', desc: 'Drop your resume — we parse every section with NLP precision.' },
  { step: '02', title: 'Gemini audits it', desc: 'Our AI finds every weak verb, missing metric, and ATS mismatch.' },
  { step: '03', title: 'Get your Aura Score', desc: 'A multi-dimensional 0–100 score: Technical Density, Impact Quotient, ATS Compatibility.' },
  { step: '04', title: 'Bridge the gap', desc: 'Get your dream role roadmap with YouTube tutorials, project ideas, and timelines.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aura-bg overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-aura-purple/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-aura-cyan/8 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-aura-purple/30 bg-aura-purple/10 text-aura-purple-light text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Powered by Gemini 1.5 Flash + NLP
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-7xl font-black leading-tight mb-6"
          >
            Audit the past.{' '}
            <span className="gradient-text">Engineer</span>
            <br />
            your future.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-aura-muted-light max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your resume. Get your Aura Score. Fix it with AI. Land your dream role.
            The only tool that bridges the gap between your college projects and industry standards.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/upload" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
              Audit My Resume Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
              Sign In
            </Link>
          </motion.div>

          {/* Sample Aura Score teaser */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 relative max-w-3xl mx-auto"
          >
            <div className="glass-card p-6 gradient-border">
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">Sample Aura Score</span>
                <span className="badge bg-green-500/20 text-green-400 border-green-500/30">Analysis Complete</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Technical Density', score: 78, color: 'from-purple-500 to-violet-600' },
                  { label: 'Impact Quotient', score: 45, color: 'from-amber-500 to-orange-600' },
                  { label: 'Formatting Health', score: 88, color: 'from-cyan-500 to-blue-600' },
                  { label: 'ATS Compatibility', score: 62, color: 'from-emerald-500 to-teal-600' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#1E1E2E" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="22"
                          fill="none"
                          stroke="url(#grad)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="138"
                          strokeDashoffset={138 - (138 * item.score) / 100}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {item.score}
                      </span>
                    </div>
                    <p className="text-xs text-aura-muted leading-tight">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating redline badge */}
            <div className="absolute -top-4 -right-4 glass-card px-3 py-2 flex items-center gap-2 text-sm border-red-500/30 animate-float">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400 font-medium">3 critical redlines</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <section className="py-16 border-y border-aura-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-black gradient-text mb-1">{stat.value}</div>
                <div className="text-aura-muted text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="section-label mb-4">Everything you need</p>
            <h2 className="text-4xl sm:text-5xl font-bold">
              National-Level Features,{' '}
              <span className="gradient-text">Zero Compromise</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className={`glass-card-hover p-6 group cursor-default`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-aura-muted text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="py-24 px-4 bg-aura-surface/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="section-label mb-4">Simple & Fast</p>
            <h2 className="text-4xl sm:text-5xl font-bold">
              From PDF to{' '}
              <span className="gradient-text">Dream Role</span>
              {' '}in minutes
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-aura-border to-transparent" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-aura-gradient flex items-center justify-center text-white font-black text-xl mx-auto mb-4 shadow-glow-purple">
                  {step.step}
                </div>
                <h3 className="font-bold mb-2">{step.title}</h3>
                <p className="text-aura-muted text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="glass-card p-12 gradient-border relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-aura-gradient-subtle pointer-events-none" />
            <div className="relative z-10">
              <Layers className="w-10 h-10 text-aura-purple mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Ready to know your{' '}
                <span className="gradient-text">Aura Score?</span>
              </h2>
              <p className="text-aura-muted mb-8 text-lg">
                Free forever. No credit card. Privacy-first — your PDF is deleted after analysis.
              </p>
              <Link href="/upload" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
                Get My Aura Score
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-aura-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-aura-gradient" />
            <span className="font-bold text-sm">Aura-Audit</span>
            <span className="text-aura-muted text-sm">— Auditing the past to engineer your future</span>
          </div>
          <p className="text-aura-muted text-sm">Built with Next.js + Gemini Flash + FastAPI</p>
        </div>
      </footer>
    </div>
  )
}
