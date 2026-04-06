'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Save, Loader2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface StudentDetail {
  _id: string; name: string; email: string; department: string; rollNumber: string
  year: number; semester: number; cgpa: number; careerReadinessScore: number
  dreamRole: string; isPlaced: boolean; skills: { name: string; level: string }[]
  placementDetails?: { companyName: string; jobRole: string; package: number; joiningDate: string }
  careerPoints: { total: number }; badges: { type: string; name: string }[]
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editPlacement, setEditPlacement] = useState(false)
  const [placement, setPlacement] = useState({ companyName: '', jobRole: '', package: '', joiningDate: '' })

  useEffect(() => {
    universityApi.getStudentById(id).then((r) => {
      setStudent(r.data.student)
      const pd = r.data.student?.placementDetails
      if (pd) setPlacement({ companyName: pd.companyName || '', jobRole: pd.jobRole || '', package: String(pd.package || ''), joiningDate: pd.joiningDate?.split('T')[0] || '' })
    }).catch(() => router.push('/tpo/students')).finally(() => setLoading(false))
  }, [id, router])

  const handleSavePlacement = async () => {
    setSaving(true)
    try {
      await universityApi.updateStudent(id, {
        isPlaced: true,
        placementDetails: { ...placement, package: parseFloat(placement.package) || 0 }
      })
      toast.success('Placement updated!')
      setEditPlacement(false)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 skeleton h-64 rounded-2xl" />
  if (!student) return null

  const LEVEL_COLORS: Record<string, string> = {
    expert: 'bg-aura-purple/20 text-aura-purple-light',
    advanced: 'bg-cyan-400/10 text-cyan-400',
    intermediate: 'bg-emerald-400/10 text-emerald-400',
    beginner: 'bg-white/5 text-aura-muted',
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-aura-muted hover:text-aura-text text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-aura-gradient flex items-center justify-center text-white text-2xl font-black">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{student.name}</h1>
              {student.isPlaced && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Placed</span>}
            </div>
            <p className="text-aura-muted text-sm mt-0.5">{student.email}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Department', value: student.department || '—' },
                { label: 'Roll No', value: student.rollNumber || '—' },
                { label: 'Year', value: student.year ? `Year ${student.year}` : '—' },
                { label: 'CGPA', value: student.cgpa || '—' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-aura-muted">{item.label}</p>
                  <p className="font-semibold text-sm mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${student.careerReadinessScore >= 70 ? 'text-emerald-400' : student.careerReadinessScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {student.careerReadinessScore}%
            </p>
            <p className="text-xs text-aura-muted">Career Ready</p>
            <p className="text-sm font-bold mt-1">{student.careerPoints?.total || 0} pts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">Skills ({student.skills?.length || 0})</h2>
          <div className="flex flex-wrap gap-1.5">
            {(student.skills || []).map((sk) => (
              <span key={sk.name} className={`px-2.5 py-1 text-xs rounded-lg font-medium ${LEVEL_COLORS[sk.level] || ''}`}>{sk.name}</span>
            ))}
            {(student.skills?.length || 0) === 0 && <p className="text-sm text-aura-muted">No skills added</p>}
          </div>
        </div>

        {/* Badges */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">Badges ({student.badges?.length || 0})</h2>
          {(student.badges?.length || 0) === 0 ? (
            <p className="text-sm text-aura-muted">No badges earned yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {student.badges.map((b, i) => (
                <span key={i} className="px-3 py-1.5 text-xs rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-semibold">{b.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placement */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Placement Details</h2>
          <button onClick={() => setEditPlacement(!editPlacement)} className="text-xs text-aura-purple-light hover:underline">
            {editPlacement ? 'Cancel' : student.isPlaced ? 'Edit' : 'Mark Placed'}
          </button>
        </div>
        {editPlacement ? (
          <div className="grid grid-cols-2 gap-3">
            {[['companyName', 'Company Name'], ['jobRole', 'Job Role']].map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                <input type="text" value={(placement as Record<string, string>)[field]} onChange={(e) => setPlacement({ ...placement, [field]: e.target.value })} className="input-field text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-aura-muted mb-1 block">Package (LPA)</label>
              <input type="number" value={placement.package} onChange={(e) => setPlacement({ ...placement, package: e.target.value })} step="0.1" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-aura-muted mb-1 block">Joining Date</label>
              <input type="date" value={placement.joiningDate} onChange={(e) => setPlacement({ ...placement, joiningDate: e.target.value })} className="input-field text-sm" />
            </div>
            <button onClick={handleSavePlacement} disabled={saving} className="btn-primary col-span-2 flex items-center justify-center gap-2 text-sm py-2.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Placement
            </button>
          </div>
        ) : student.isPlaced && student.placementDetails ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Company', value: student.placementDetails.companyName },
              { label: 'Role', value: student.placementDetails.jobRole },
              { label: 'Package', value: student.placementDetails.package ? `${student.placementDetails.package} LPA` : '—' },
              { label: 'Joining', value: student.placementDetails.joiningDate ? new Date(student.placementDetails.joiningDate).toLocaleDateString() : '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-aura-muted">{item.label}</p>
                <p className="font-semibold text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-aura-muted">Not placed yet. Click "Mark Placed" to record placement.</p>
        )}
      </div>
    </div>
  )
}
