'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Filter, Star, ChevronRight, Trash2, Edit2, X, Loader2 } from 'lucide-react'
import { universityApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Student {
  _id: string
  name: string
  email: string
  department?: string
  year?: number
  cgpa?: number
  careerReadinessScore?: number
  isPlaced?: boolean
  skills: { name: string }[]
  rollNumber?: string
}

export default function TPOStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ department: '', year: '', minCGPA: '', isPlaced: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = (params?: Record<string, string>) => {
    setLoading(true)
    universityApi.getStudents(params).then((r) => setStudents(r.data.students || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filters.department) params.department = filters.department
    if (filters.year) params.year = filters.year
    if (filters.minCGPA) params.minCGPA = filters.minCGPA
    if (filters.isPlaced) params.isPlaced = filters.isPlaced
    load(params)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this student from the system?')) return
    setDeleting(id)
    try {
      await universityApi.deleteStudent(id)
      setStudents((prev) => prev.filter((s) => s._id !== id))
      toast.success('Student removed')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const scoreColor = (s: number) => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-aura-muted text-sm mt-1">{students.length} students registered</p>
        </div>
        <Link href="/tpo/upload" className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
          <Users className="w-4 h-4" /> Batch Upload
        </Link>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, roll number..."
            className="input-field pl-9 w-full"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 text-sm px-4 py-2 ${showFilters ? 'border-aura-purple text-aura-purple-light' : ''}`}>
          <Filter className="w-4 h-4" /> Filters
        </button>
        <button onClick={handleSearch} className="btn-primary text-sm px-4 py-2">Search</button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-aura-muted mb-1 block">Department</label>
            <input type="text" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} placeholder="CSE, ECE..." className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1 block">Year</label>
            <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className="input-field text-sm">
              <option value="">All years</option>
              {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1 block">Min CGPA</label>
            <input type="number" value={filters.minCGPA} onChange={(e) => setFilters({ ...filters, minCGPA: e.target.value })} placeholder="6.0" min="0" max="10" step="0.1" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-aura-muted mb-1 block">Placement Status</label>
            <select value={filters.isPlaced} onChange={(e) => setFilters({ ...filters, isPlaced: e.target.value })} className="input-field text-sm">
              <option value="">All</option>
              <option value="true">Placed</option>
              <option value="false">Not Placed</option>
            </select>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : students.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted mb-3">No students found</p>
          <Link href="/tpo/upload" className="btn-primary text-sm px-6 py-2">Upload CSV</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((s, i) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-aura-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{s.name}</p>
                  {s.rollNumber && <span className="text-xs text-aura-muted">{s.rollNumber}</span>}
                  {s.isPlaced && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Placed</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-aura-muted">
                  {s.department && <span>{s.department}</span>}
                  {s.year && <span>Year {s.year}</span>}
                  {s.cgpa != null && <span className="flex items-center gap-1"><Star className="w-3 h-3" />{s.cgpa}</span>}
                  <span>{s.skills?.length || 0} skills</span>
                </div>
              </div>
              {s.careerReadinessScore != null && (
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${scoreColor(s.careerReadinessScore)}`}>{s.careerReadinessScore}%</p>
                  <p className="text-xs text-aura-muted">ready</p>
                </div>
              )}
              <div className="flex gap-1">
                <Link href={`/tpo/students/${s._id}`} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(s._id)}
                  disabled={deleting === s._id}
                  className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-aura-muted hover:text-red-400 transition-colors"
                >
                  {deleting === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
