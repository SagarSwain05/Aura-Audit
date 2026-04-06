'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, Upload, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { companyApi } from '@/lib/api'
import toast from 'react-hot-toast'

type DocType = 'gst' | 'cin' | 'pan' | 'moa' | 'other'
interface KYCDoc { docType: DocType; url: string; status: 'pending' | 'approved' | 'rejected'; reviewComment?: string; uploadedAt: string }

const DOC_TYPES: { id: DocType; label: string; desc: string }[] = [
  { id: 'gst', label: 'GST Certificate', desc: 'Goods and Services Tax registration' },
  { id: 'cin', label: 'CIN', desc: 'Company Identification Number' },
  { id: 'pan', label: 'PAN Card', desc: 'Permanent Account Number' },
  { id: 'moa', label: 'MOA', desc: 'Memorandum of Association' },
  { id: 'other', label: 'Other', desc: 'Any other relevant document' },
]

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  approved: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  rejected: <XCircle className="w-4 h-4 text-red-400" />,
}

export default function KYCPage() {
  const [docs, setDocs] = useState<KYCDoc[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocType>('gst')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    companyApi.getProfile().then((r) => {
      setDocs(r.data.company?.kycDocuments || [])
      setIsVerified(r.data.company?.isVerified || false)
    }).catch(() => {})
  }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return toast.error('Select a file')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('docType', selectedDoc)
    setUploading(true)
    try {
      const r = await companyApi.uploadKYC(fd)
      setDocs(r.data.kycDocuments || [])
      toast.success('Document uploaded!')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">KYC Verification</h1>
          <p className="text-aura-muted text-sm mt-1">Upload documents to get your company verified</p>
        </div>
        {isVerified && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-400/10 text-emerald-400 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Verified
          </div>
        )}
      </div>

      {/* Upload section */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4">Upload Document</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-aura-muted-light mb-1.5 block">Document Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDoc(d.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${selectedDoc === d.id ? 'border-aura-purple bg-aura-purple/10' : 'border-white/5 hover:border-white/10'}`}
                >
                  <p className="text-xs font-semibold">{d.label}</p>
                  <p className="text-xs text-aura-muted mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-aura-muted-light mb-1.5 block">File (PDF, JPG, PNG — max 5MB)</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-sm" />
          </div>

          <button onClick={handleUpload} disabled={uploading} className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Document
          </button>
        </div>
      </div>

      {/* Uploaded docs */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4">Uploaded Documents</h2>
        {docs.length === 0 ? (
          <div className="text-center py-6 text-aura-muted text-sm">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                {STATUS_ICONS[doc.status]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium uppercase">{doc.docType}</p>
                    <span className={`text-xs capitalize ${doc.status === 'approved' ? 'text-emerald-400' : doc.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.reviewComment && <p className="text-xs text-aura-muted mt-0.5">{doc.reviewComment}</p>}
                  <p className="text-xs text-aura-muted mt-0.5">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-aura-purple-light hover:underline flex-shrink-0">
                  View
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-4 bg-cyan-400/5 border-cyan-400/20">
        <p className="text-xs text-aura-muted-light">
          Documents are reviewed by university TPOs within 2-3 business days. You&apos;ll receive a notification once verified.
        </p>
      </div>
    </div>
  )
}
