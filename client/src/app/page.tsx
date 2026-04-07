'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, Target, Map, Star, Shield, ChevronRight, Sparkles,
  BarChart3, Brain, Layers, BookOpen, Github, Zap, Trophy,
  Briefcase, Users, GraduationCap, Building2, Activity,
  Bell, FileText, TrendingUp, Award, Search, PieChart,
  ClipboardList, CheckCircle, Upload, UserCheck,
} from 'lucide-react'
import Navbar from '@/components/Navbar'

const FEATURES = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'AI Resume Auditor',
    description: 'Grammarly-style redlines powered by Gemini. Fix weak verbs, missing metrics, and ATS gaps in seconds.',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Career Matcher',
    description: "Semantic skill analysis matches you to the top 3 roles you're 80%+ ready for today, with salary data.",
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: 'Gap Analysis 2.0',
    description: '30-day personalized learning roadmaps with YouTube & Coursera resources to bridge your skill gaps.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Interview Simulator',
    description: '5 AI-generated questions based strictly on YOUR projects — not generic questions.',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Market Demand Pulse',
    description: 'Real-time hiring temperature for your skills in Bangalore, Hyderabad, London, and New York.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Blind Hiring Mode',
    description: 'Remove name, gender and location from your resume automatically to promote fair hiring.',
    gradient: 'from-amber-500 to-yellow-600',
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

const STUDENT_FEATURES = [
  { icon: <Zap className="w-4 h-4" />, label: 'AI Resume Audit & Aura Score' },
  { icon: <Trophy className="w-4 h-4" />, label: 'Leaderboard & Career Points' },
  { icon: <Briefcase className="w-4 h-4" />, label: 'Live Job Board (One-Click Apply)' },
  { icon: <Brain className="w-4 h-4" />, label: 'AI-Proctored Skill Assessments' },
  { icon: <Activity className="w-4 h-4" />, label: 'Skills Tracker & Career Readiness' },
  { icon: <FileText className="w-4 h-4" />, label: 'AI Resume Builder' },
  { icon: <TrendingUp className="w-4 h-4" />, label: 'Career Analytics & Progress' },
  { icon: <Bell className="w-4 h-4" />, label: 'Real-Time Notifications' },
  { icon: <Map className="w-4 h-4" />, label: '30-Day Learning Roadmaps' },
  { icon: <Award className="w-4 h-4" />, label: 'Badges & Gamification' },
]

const COMPANY_FEATURES = [
  { icon: <Search className="w-4 h-4" />, label: 'AI Candidate Matching Engine' },
  { icon: <Briefcase className="w-4 h-4" />, label: 'Job Posting & Management' },
  { icon: <Users className="w-4 h-4" />, label: 'Talent Pipeline Dashboard' },
  { icon: <PieChart className="w-4 h-4" />, label: 'Hiring Analytics & Reports' },
  { icon: <UserCheck className="w-4 h-4" />, label: 'KYC Verification' },
  { icon: <ClipboardList className="w-4 h-4" />, label: 'Assessment Score Access' },
  { icon: <Star className="w-4 h-4" />, label: 'Aura Score Candidate Filter' },
  { icon: <Shield className="w-4 h-4" />, label: 'Blind Hiring Compliance Mode' },
]

const UNIVERSITY_FEATURES = [
  { icon: <GraduationCap className="w-4 h-4" />, label: 'Placement Rate Tracker' },
  { icon: <BarChart3 className="w-4 h-4" />, label: 'Employability Reports (Dept-wise)' },
  { icon: <Activity className="w-4 h-4" />, label: 'Student Progress Monitoring' },
  { icon: <Building2 className="w-4 h-4" />, label: 'Company Connections Hub' },
  { icon: <Upload className="w-4 h-4" />, label: 'Bulk Resume Upload' },
  { icon: <CheckCircle className="w-4 h-4" />, label: 'Intervention Alerts (At-Risk)' },
  { icon: <ClipboardList className="w-4 h-4" />, label: 'TPO Assessment Management' },
  { icon: <TrendingUp className="w-4 h-4" />, label: 'Year-on-Year Placement Trends' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
}

const ECOSYSTEM = [
  {
    role: 'Students',
    icon: <GraduationCap className="w-6 h-6" />,
    tagline: 'From campus to career, powered by AI',
    description: 'A complete career launchpad — audit your resume, track your skills, compete on leaderboards, apply to live jobs, and prepare for interviews, all in one dashboard.',
    gradient: 'from-aura-purple to-violet-600',
    border: 'border-aura-purple/30',
    bg: 'bg-aura-purple/5',
    cta: 'Explore Student Dashboard',
    href: '/auth?tab=signup&role=student',
    features: STUDENT_FEATURES,
    badge: { color: 'bg-aura-purple/20 text-aura-purple-light border-aura-purple/30', label: 'For Students' },
  },
  {
    role: 'Companies',
    icon: <Building2 className="w-6 h-6" />,
    tagline: 'Hire smarter with AI-ranked talent',
    description: 'Post jobs, access AI-matched candidates filtered by Aura Score, manage your hiring pipeline, and get deep analytics — all without sifting through hundreds of unqualified resumes.',
    gradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    cta: 'Explore Company Dashboard',
    href: '/auth?tab=signup&role=company',
    features: COMPANY_FEATURES,
    badge: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'For Industry' },
  },
  {
    role: 'Universities',
    icon: <GraduationCap className="w-6 h-6" />,
    tagline: 'Turn placement data into placement results',
    description: 'Give your TPO a real-time command center — track every student\'s career readiness, spot at-risk students before placement season, and build stronger industry connections.',
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    cta: 'Explore University Dashboard',
    href: '/auth?tab=signup&role=tpo',
    features: UNIVERSITY_FEATURES,
    badge: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'For Universities' },
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-aura-purple/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-aura-cyan/8 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
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
            style={{ color: 'rgb(var(--c-text))' }}
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
            className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgb(var(--c-muted))' }}
          >
            Upload your resume. Get your Aura Score. Fix it with AI. Land your dream role.
            The only platform that connects students, companies, and universities in one career ecosystem.
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
            <Link href="/auth?tab=signup" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
              Get Started
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Audience pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
          >
            {[
              { label: 'For Students', color: 'bg-aura-purple/20 text-aura-purple-light border-aura-purple/30' },
              { label: 'For Companies', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
              { label: 'For Universities', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            ].map((p) => (
              <span key={p.label} className={`px-3 py-1 rounded-full text-xs font-medium border ${p.color}`}>
                {p.label}
              </span>
            ))}
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
                <span className="badge bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs font-medium">Analysis Complete</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Technical Density', score: 78 },
                  { label: 'Impact Quotient', score: 45 },
                  { label: 'Formatting Health', score: 88 },
                  { label: 'ATS Compatibility', score: 62 },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="rgb(var(--c-bord))" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="22"
                          fill="none"
                          stroke="url(#score-grad)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="138"
                          strokeDashoffset={138 - (138 * item.score) / 100}
                        />
                        <defs>
                          <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#9F67FF" />
                            <stop offset="100%" stopColor="#22D3EE" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'rgb(var(--c-text))' }}>
                        {item.score}
                      </span>
                    </div>
                    <p className="text-xs leading-tight" style={{ color: 'rgb(var(--c-muted))' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating badge */}
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
                <div className="text-sm" style={{ color: 'rgb(var(--c-muted))' }}>{stat.label}</div>
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
            <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: 'rgb(var(--c-text))' }}>
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
                className="glass-card-hover p-6 group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--c-muted))' }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ecosystem: For Everyone ────────────────────────── */}
      <section className="py-24 px-4" style={{ backgroundColor: 'rgb(var(--c-surf) / 0.4)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="section-label mb-4">Built for the entire ecosystem</p>
            <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: 'rgb(var(--c-text))' }}>
              One Platform,{' '}
              <span className="gradient-text">Three Dashboards</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: 'rgb(var(--c-muted))' }}>
              Whether you're a student building your career, a company looking for top talent,
              or a university tracking placement outcomes — Aura-Audit has a purpose-built dashboard for you.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {ECOSYSTEM.map((eco, i) => (
              <motion.div
                key={eco.role}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.12 }}
                className={`glass-card p-6 flex flex-col border ${eco.border} ${eco.bg} hover:shadow-lg transition-all duration-300`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${eco.gradient} flex items-center justify-center text-white`}>
                    {eco.icon}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${eco.badge.color}`}>
                    {eco.badge.label}
                  </span>
                </div>

                <h3 className="text-xl font-black mb-1" style={{ color: 'rgb(var(--c-text))' }}>{eco.role}</h3>
                <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--c-mutl))' }}>{eco.tagline}</p>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgb(var(--c-muted))' }}>{eco.description}</p>

                {/* Feature list */}
                <div className="flex-1 grid grid-cols-1 gap-2 mb-6">
                  {eco.features.map((feat) => (
                    <div key={feat.label} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-aura-muted shrink-0">
                        {feat.icon}
                      </div>
                      <span className="text-xs" style={{ color: 'rgb(var(--c-muted))' }}>{feat.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={eco.href}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r ${eco.gradient} text-white hover:opacity-90 hover:scale-[1.02]`}
                >
                  {eco.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="section-label mb-4">Simple &amp; Fast</p>
            <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: 'rgb(var(--c-text))' }}>
              From PDF to{' '}
              <span className="gradient-text">Dream Role</span>
              {' '}in minutes
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
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
                <h3 className="font-bold mb-2" style={{ color: 'rgb(var(--c-text))' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--c-muted))' }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Trust ───────────────────────────── */}
      <section className="py-16 px-4 border-y border-aura-border" style={{ backgroundColor: 'rgb(var(--c-surf) / 0.3)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <p className="section-label mb-2">Why developers choose us</p>
            <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--c-text))' }}>
              Built to win hackathons. <span className="gradient-text">Designed for careers.</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Shield className="w-5 h-5" />, title: 'Privacy First', desc: 'Your PDF is deleted from our servers immediately after analysis. We never sell your data.' },
              { icon: <Zap className="w-5 h-5" />, title: '30-Second Audit', desc: 'Gemini 1.5 Flash gives you a full audit in under 60 seconds — faster than any human recruiter.' },
              { icon: <TrendingUp className="w-5 h-5" />, title: 'Real Market Data', desc: 'Career recommendations are backed by live job market signals, not static templates.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-aura-purple/10 flex items-center justify-center text-aura-purple-light shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'rgb(var(--c-text))' }}>{item.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--c-muted))' }}>{item.desc}</p>
                </div>
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
              <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: 'rgb(var(--c-text))' }}>
                Ready to know your{' '}
                <span className="gradient-text">Aura Score?</span>
              </h2>
              <p className="mb-8 text-lg" style={{ color: 'rgb(var(--c-muted))' }}>
                Free forever. No credit card. Privacy-first — your PDF is deleted after analysis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/upload" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
                  Get My Aura Score
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/auth?tab=signup" className="btn-secondary inline-flex items-center gap-2 text-base px-8 py-4">
                  Create Free Account
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-aura-border py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-aura-gradient flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm" style={{ color: 'rgb(var(--c-text))' }}>Aura-Audit</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: 'rgb(var(--c-muted))' }}>
              <Link href="/upload" className="hover:text-aura-purple-light transition-colors">Audit Resume</Link>
              <Link href="/auth?tab=signup&role=student" className="hover:text-aura-purple-light transition-colors">Students</Link>
              <Link href="/auth?tab=signup&role=company" className="hover:text-aura-purple-light transition-colors">Companies</Link>
              <Link href="/auth?tab=signup&role=tpo" className="hover:text-aura-purple-light transition-colors">Universities</Link>
              <Link href="/auth" className="hover:text-aura-purple-light transition-colors">Sign In</Link>
            </div>
            <a
              href="https://github.com/SagarSwain05/Aura-Audit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors hover:text-aura-purple-light"
              style={{ color: 'rgb(var(--c-muted))' }}
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
          <div className="border-t border-aura-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ color: 'rgb(var(--c-muted))' }}>
            <p>© 2026 Aura-Audit. Built by <a href="https://github.com/SagarSwain05" target="_blank" rel="noopener noreferrer" className="hover:text-aura-purple-light transition-colors font-medium">Sagar Swain</a>.</p>
            <p>Powered by Next.js · Gemini Flash · FastAPI · MongoDB</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
