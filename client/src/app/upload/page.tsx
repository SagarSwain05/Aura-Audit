'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Upload, FileText, X, Loader2, Zap, Shield, Eye, EyeOff, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { auditApi } from '@/lib/api'
import { useAuditStore } from '@/store/useAuditStore'

const TIPS = [
  '📊 Resumes with 3+ quantified metrics score 40% higher',
  '⚡ Action verbs like "Architected" score better than "Worked on"',
  '🔑 Include your full tech stack — even minor tools matter',
  '📋 Keep it to 1 page for <3 years experience, 2 pages max otherwise',
  '🎯 Match keywords from the job description you are targeting',
]

export default function UploadPage() {
  const router = useRouter()
  const { user, setIsAnalyzing } = useAuditStore()
  const [file, setFile] = useState<File | null>(null)
  const [dreamRole, setDreamRole] = useState(user?.dreamRole || '')
  const [blindMode, setBlindMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.message || 'Invalid file'
      toast.error(reason)
    },
  })

  const handleSubmit = async () => {
    if (!file) return toast.error('Please upload a PDF resume')
    if (!user) return router.push('/auth')

    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('dreamRole', dreamRole)
      formData.append('blindMode', blindMode.toString())

      setProgress(30)
      const res = await auditApi.create(formData)
      setProgress(60)

      const { auditId } = res.data
      setIsAnalyzing(true)

      // Poll for completion
      let attempts = 0
      const maxAttempts = 60
      const poll = setInterval(async () => {
        attempts++
        try {
          const statusRes = await auditApi.getStatus(auditId)
          const { status } = statusRes.data

          setProgress(60 + Math.min(attempts * 0.5, 35))

          if (status === 'completed') {
            clearInterval(poll)
            setProgress(100)
            setIsAnalyzing(false)
            toast.success('Aura analysis complete!')
            router.push(`/audit/${auditId}`)
          } else if (status === 'failed') {
            clearInterval(poll)
            setIsAnalyzing(false)
            toast.error('Analysis failed. Please try again.')
            setUploading(false)
          }

          if (attempts >= maxAttempts) {
            clearInterval(poll)
            setIsAnalyzing(false)
            toast.error('Analysis timed out. Please try again.')
            setUploading(false)
          }
        } catch {
          clearInterval(poll)
          setUploading(false)
        }
      }, 2000)

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--c-bg))' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-aura-purple/30 bg-aura-purple/10 text-aura-purple-light text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Gemini 1.5 Flash Analysis
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: 'rgb(var(--c-text))' }}>
            Upload Your <span className="gradient-text">Resume</span>
          </h1>
          <p style={{ color: 'rgb(var(--c-muted))' }}>
            PDF only · Max 10 MB · Deleted immediately after analysis
          </p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-aura-purple bg-aura-purple/10 scale-[1.01]'
                : file
                ? 'border-aura-green/50 bg-aura-green/5'
                : 'border-aura-border hover:border-aura-purple/50 hover:bg-aura-purple/5'
            }`}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-aura-text">{file.name}</p>
                    <p className="text-sm text-aura-muted">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="text-aura-muted hover:text-aura-red transition-colors flex items-center gap-1 text-sm"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDragActive ? 'bg-aura-purple/30 scale-110' : 'bg-aura-surface'
                  }`}>
                    <Upload className={`w-8 h-8 ${isDragActive ? 'text-aura-purple-light' : 'text-aura-muted'}`} />
                  </div>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: 'rgb(var(--c-text))' }}>
                      {isDragActive ? 'Drop it here!' : 'Drag & drop your resume'}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--c-muted))' }}>or click to browse files · PDF only</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-4"
        >
          {/* Dream role */}
          <div className="glass-card p-5">
            <label className="text-sm font-medium text-aura-muted-light mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-aura-purple" />
              Dream Role <span className="text-aura-muted">(for gap analysis)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. DevOps Engineer, ML Engineer, Full Stack Developer..."
              value={dreamRole}
              onChange={(e) => setDreamRole(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Blind mode toggle */}
          <div
            className={`glass-card p-5 flex items-center justify-between cursor-pointer transition-all duration-200 ${
              blindMode ? 'border-aura-cyan/40 bg-aura-cyan/5' : ''
            }`}
            onClick={() => setBlindMode(!blindMode)}
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${blindMode ? 'text-aura-cyan' : 'text-aura-muted'}`} />
              <div>
                <p className="font-medium text-sm">Blind Hiring Mode</p>
                <p className="text-xs text-aura-muted">Removes name, gender & location from analysis</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
              blindMode ? 'bg-aura-cyan' : 'bg-aura-border'
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                blindMode ? 'left-5' : 'left-0.5'
              }`} />
            </div>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 px-4 py-3 rounded-xl bg-aura-surface border border-aura-border text-sm text-aura-muted"
        >
          <span className="font-medium text-aura-muted-light">Pro tip: </span>
          {TIPS[tipIndex]}
        </motion.div>

        {/* Upload progress */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-aura-purple" />
                {progress < 60 ? 'Uploading resume...' : 'Gemini analyzing...'}
              </span>
              <span className="text-sm text-aura-muted">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-aura-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-aura-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-aura-muted mt-2">
              {progress < 60
                ? 'Extracting text with PyMuPDF...'
                : 'Running semantic audit, career matching & gap analysis...'}
            </p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={handleSubmit}
          disabled={!file || uploading}
          className={`mt-6 w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 ${
            !file || uploading
              ? 'bg-aura-surface border border-aura-border text-aura-muted cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing with Gemini...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Get My Aura Score
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
