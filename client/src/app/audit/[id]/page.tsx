'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Download, Share2, Loader2, FileText, Zap, Target, Map, Brain, BarChart3, Mic, RefreshCw, Shield } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import AuraScoreRing from '@/components/audit/AuraScoreRing'
import RedlinePanel from '@/components/audit/RedlinePanel'
import CareerMatchCard from '@/components/career/CareerMatchCard'
import GapAnalysisPanel from '@/components/career/GapAnalysisPanel'
import MarketDemandPulse from '@/components/career/MarketDemandPulse'
import InterviewPanel from '@/components/audit/InterviewPanel'
import { auditApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'
import type { Audit } from '@/types'

const TABS = [
  { id: 'audit', label: 'Redlines', icon: Zap },
  { id: 'career', label: 'Career Match', icon: Target },
  { id: 'gap', label: 'Gap Analysis', icon: Map },
  { id: 'market', label: 'Market Pulse', icon: BarChart3 },
  { id: 'interview', label: 'Interview Sim', icon: Brain },
] as const

type TabId = typeof TABS[number]['id']

export default function AuditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { currentAudit, setCurrentAudit, activeTab, setActiveTab } = useAuditStore()
  const [audit, setAudit] = useState<Audit | null>(currentAudit)
  const [loading, setLoading] = useState(!currentAudit)
  const [roadmapLoading, setRoadmapLoading] = useState(false)

  useEffect(() => {
    if (currentAudit?._id === id) {
      setAudit(currentAudit)
      return
    }
    const fetchAudit = async () => {
      try {
        const res = await auditApi.getById(id)
        setAudit(res.data.audit)
        setCurrentAudit(res.data.audit)
      } catch {
        toast.error('Audit not found')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [id])

  const handleGetRoadmap = async (role: string, skills: string[]) => {
    setRoadmapLoading(true)
    try {
      const res = await auditApi.generateRoadmap({ skills, dreamRole: role, days: 30 })
      useAuditStore.getState().setRoadmap(res.data)
      router.push('/roadmap')
    } catch {
      toast.error('Failed to generate roadmap')
    } finally {
      setRoadmapLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-aura-bg flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-aura-purple mx-auto mb-3" />
          <p className="text-aura-muted">Loading audit results...</p>
        </div>
      </div>
    )
  }

  if (!audit) return null

  const isProcessing = audit.status === 'processing'
  const isFailed = audit.status === 'failed'

  return (
    <div className="min-h-screen bg-aura-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-aura-muted hover:text-aura-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg">Audit Results</h1>
                {audit.blindMode && (
                  <span className="badge bg-aura-cyan/20 text-aura-cyan border-aura-cyan/30 text-[10px]">
                    <Shield className="w-3 h-3" /> Blind Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-aura-muted">{audit.originalFilename} · {new Date(audit.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
              </span>
            )}
            <button
              onClick={() => window.open(audit.resumeUrl, '_blank')}
              className="btn-secondary py-2 text-sm flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> View PDF
            </button>
          </div>
        </div>

        {/* Processing state */}
        {isProcessing && (
          <div className="glass-card p-8 text-center mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-aura-purple mx-auto mb-3" />
            <h3 className="font-bold mb-1">Gemini is analyzing your resume</h3>
            <p className="text-aura-muted text-sm">This usually takes 30–60 seconds. Please wait...</p>
            <button
              onClick={async () => {
                const res = await auditApi.getStatus(id)
                if (res.data.status === 'completed') {
                  const full = await auditApi.getById(id)
                  setAudit(full.data.audit)
                  setCurrentAudit(full.data.audit)
                }
              }}
              className="mt-4 btn-secondary text-sm py-2 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Check Status
            </button>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="glass-card p-8 text-center mb-6 border-red-500/20">
            <p className="text-red-400 mb-2">Analysis failed: {(audit as unknown as Record<string, string>).errorMessage}</p>
            <Link href="/upload" className="btn-primary text-sm">Try Again</Link>
          </div>
        )}

        {/* Main layout */}
        {audit.status === 'completed' && audit.auraScore && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            {/* Left sidebar: Aura Score */}
            <div className="space-y-4">
              <AuraScoreRing score={audit.auraScore} />

              {/* Resume meta stats */}
              <div className="glass-card p-4">
                <p className="section-label mb-3">Resume Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Pages', value: audit.resumeMeta?.pages || 1 },
                    { label: 'Words', value: audit.resumeMeta?.word_count || '—' },
                    { label: 'Metrics', value: audit.resumeMeta?.metrics_count?.total_metrics || 0 },
                    { label: 'Weak Verbs', value: audit.resumeMeta?.weak_verbs_count || 0 },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-aura-surface rounded-xl p-3 border border-aura-border text-center">
                      <p className="text-lg font-bold text-aura-text">{stat.value}</p>
                      <p className="text-[10px] text-aura-muted">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted skills */}
              {audit.extractedSkills.length > 0 && (
                <div className="glass-card p-4">
                  <p className="section-label mb-3">Detected Skills ({audit.extractedSkills.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.extractedSkills.map((skill) => (
                      <span key={skill} className="text-[11px] px-2 py-1 rounded-lg bg-aura-purple/10 text-aura-purple-light border border-aura-purple/20">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Main content with tabs */}
            <div className="glass-card overflow-hidden flex flex-col min-h-[600px]">
              {/* Tab bar */}
              <div className="flex border-b border-aura-border overflow-x-auto scrollbar-none shrink-0">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                        isActive
                          ? 'border-aura-purple text-aura-purple-light bg-aura-purple/5'
                          : 'border-transparent text-aura-muted hover:text-aura-text'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {tab.id === 'audit' && audit.redlines.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] flex items-center justify-center font-bold">
                          {audit.redlines.filter(r => r.severity === 'critical').length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-y-auto"
                  >
                    {activeTab === 'audit' && (
                      <RedlinePanel redlines={audit.redlines} auditId={id} />
                    )}

                    {activeTab === 'career' && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold">Top Career Matches</h3>
                          <p className="text-xs text-aura-muted">Based on your skill profile</p>
                        </div>
                        {audit.jobMatches.length > 0 ? (
                          audit.jobMatches.map((match, i) => (
                            <CareerMatchCard
                              key={match.title}
                              match={match}
                              rank={i + 1}
                              onViewRoadmap={handleGetRoadmap}
                            />
                          ))
                        ) : (
                          <p className="text-aura-muted text-sm text-center py-12">
                            No matches found. Try adding more skills to your resume.
                          </p>
                        )}
                        {roadmapLoading && (
                          <div className="text-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-aura-purple mx-auto mb-2" />
                            <p className="text-sm text-aura-muted">Generating your roadmap...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'gap' && (
                      <div className="p-5">
                        {audit.gapAnalysis ? (
                          <GapAnalysisPanel analysis={audit.gapAnalysis} />
                        ) : (
                          <div className="text-center py-12">
                            <Map className="w-8 h-8 text-aura-muted mx-auto mb-3" />
                            <p className="font-medium mb-1">No gap analysis yet</p>
                            <p className="text-aura-muted text-sm mb-4">
                              Set your dream role to get a personalized gap analysis.
                            </p>
                            <Link href="/upload" className="btn-secondary text-sm py-2">
                              Re-audit with Dream Role
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'market' && (
                      <div className="p-5">
                        {Object.keys(audit.marketDemand || {}).length > 0 ? (
                          <MarketDemandPulse
                            demand={audit.marketDemand}
                            meta={audit.marketMeta || { trending: [], hot_cities: {} }}
                          />
                        ) : (
                          <p className="text-aura-muted text-sm text-center py-12">
                            Market data unavailable.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'interview' && (
                      <div className="p-5">
                        <InterviewPanel
                          questions={audit.interviewQuestions || []}
                          auditId={id}
                          dreamRole={audit.dreamRole}
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
