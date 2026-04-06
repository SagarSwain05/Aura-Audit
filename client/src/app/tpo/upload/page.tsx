'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download, AlertTriangle } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface UploadResult {
  created: number
  updated: number
  failed: number
  errors: { row: number; email: string; error: string }[]
}

export default function BatchUploadPage() {
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      toast.error('Only CSV files are accepted')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return toast.error('Select a CSV file')
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const r = await universityApi.batchUpload(fd)
      setResult(r.data.result || r.data)
      toast.success(`Upload complete: ${r.data.result?.created || 0} created, ${r.data.result?.updated || 0} updated`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = [
      'name,email,rollNumber,department,year,semester,cgpa,phone,dreamRole',
      'Sagar Swain,sagar@example.com,CS2021001,CSE,3,6,8.5,9876543210,Full Stack Developer',
      'Priya Sharma,priya@example.com,CS2021002,CSE,3,6,9.0,9876543211,Data Scientist',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'student_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Batch Upload Students</h1>
        <p className="text-aura-muted text-sm mt-1">Upload a CSV to add or update students in bulk</p>
      </div>

      {/* Template download */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Download CSV Template</p>
          <p className="text-xs text-aura-muted mt-0.5">Required: name, email. Optional: rollNumber, department, year, semester, cgpa, phone, dreamRole</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
          <Download className="w-4 h-4" /> Template
        </button>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileRef.current?.click()}
        className={`glass-card p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-aura-purple bg-aura-purple/5' : 'hover:border-white/10'}`}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-emerald-400" />
            <p className="font-semibold text-emerald-400">{file.name}</p>
            <p className="text-xs text-aura-muted">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`w-10 h-10 ${dragOver ? 'text-aura-purple-light' : 'text-aura-muted'}`} />
            <p className="font-semibold">Drag & drop CSV here</p>
            <p className="text-sm text-aura-muted">or click to browse</p>
          </div>
        )}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Upload Students'}
        </button>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Created', value: result.created, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: 'Updated', value: result.updated, icon: CheckCircle, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
              { label: 'Failed', value: result.failed, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-aura-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors?.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> {result.errors.length} Error(s)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs p-2 bg-red-400/5 rounded-xl border border-red-400/20">
                    <span className="text-red-400 font-semibold">Row {err.row}</span>
                    {err.email && <span className="text-aura-muted"> · {err.email}</span>}
                    <span className="text-aura-muted"> — {err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
