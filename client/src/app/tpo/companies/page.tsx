'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, CheckCircle, XCircle, Clock, FileText, Loader2, Eye } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface PendingCompany {
  _id: string
  name: string
  email: string
  industry?: string
  website?: string
  kycDocuments: { docType: string; url: string; status: string; uploadedAt: string }[]
  createdAt: string
}

export default function CompanyApprovalPage() {
  const [companies, setCompanies] = useState<PendingCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [selected, setSelected] = useState<PendingCompany | null>(null)
  const [comment, setComment] = useState('')

  const load = () => {
    universityApi.getPendingCompanies().then((r) => setCompanies(r.data.companies || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleVerify = async (companyId: string, status: 'approved' | 'rejected') => {
    setReviewing(companyId)
    try {
      await universityApi.verifyCompany(companyId, { status, comment })
      setCompanies((prev) => prev.filter((c) => c._id !== companyId))
      setSelected(null)
      setComment('')
      toast.success(`Company ${status}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Company Approval</h1>
        <p className="text-aura-muted text-sm mt-1">Review and approve company KYC submissions</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : companies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-aura-muted">No pending company verifications</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-3">
            {companies.map((c, i) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(c)}
                className={`glass-card p-4 cursor-pointer transition-all hover:border-white/10 ${selected?._id === c._id ? 'border-aura-purple' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-aura-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-aura-muted">{c.industry || 'Industry not set'} · {c.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock className="w-3 h-3" /> {c.kycDocuments.length} doc(s) pending
                      </span>
                      <span className="text-xs text-aura-muted">· {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detail panel */}
          {selected ? (
            <motion.div key={selected._id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-5 h-fit space-y-4">
              <div>
                <h2 className="font-bold">{selected.name}</h2>
                <p className="text-sm text-aura-muted">{selected.email}</p>
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-xs text-aura-purple-light hover:underline">{selected.website}</a>
                )}
              </div>

              <div>
                <p className="text-xs text-aura-muted font-semibold uppercase tracking-wide mb-2">KYC Documents</p>
                <div className="space-y-2">
                  {selected.kycDocuments.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                      <FileText className="w-4 h-4 text-aura-muted flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase">{doc.docType}</p>
                        <p className="text-xs text-aura-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-aura-purple-light hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-aura-muted mb-1.5 block">Review Comment (optional)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note for the company..." rows={2} className="input-field resize-none w-full text-sm" />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify(selected._id, 'rejected')}
                  disabled={reviewing === selected._id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
                >
                  {reviewing === selected._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
                <button
                  onClick={() => handleVerify(selected._id, 'approved')}
                  disabled={reviewing === selected._id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/20 text-emerald-400 hover:bg-emerald-400/30 transition-all text-sm font-semibold"
                >
                  {reviewing === selected._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card p-8 text-center h-fit">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-aura-muted text-sm">Select a company to review its KYC documents</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
