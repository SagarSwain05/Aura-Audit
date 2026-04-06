'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, TrendingUp, Building2, Star, Users, Award } from 'lucide-react'
import { universityApi } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PlacedStudent {
  _id: string
  name: string
  department?: string
  placementDetails: { companyName: string; jobRole: string; package: number; joiningDate: string }
}

export default function PlacementsPage() {
  const [placed, setPlaced] = useState<PlacedStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    universityApi.getStudents({ isPlaced: 'true', limit: '100' }).then((r) => {
      setPlaced(r.data.students || [])
    }).finally(() => setLoading(false))
  }, [])

  const totalPlaced = placed.length
  const avgPackage = totalPlaced
    ? (placed.reduce((s, p) => s + (p.placementDetails?.package || 0), 0) / totalPlaced).toFixed(2)
    : '0'
  const maxPackage = totalPlaced ? Math.max(...placed.map((p) => p.placementDetails?.package || 0)) : 0

  // Company-wise count
  const companyMap = placed.reduce((acc, p) => {
    const c = p.placementDetails?.companyName || 'Unknown'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const companyData = Object.entries(companyMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

  // Package distribution
  const packageBuckets = [
    { range: '<5 LPA', min: 0, max: 5 },
    { range: '5-10 LPA', min: 5, max: 10 },
    { range: '10-20 LPA', min: 10, max: 20 },
    { range: '20+ LPA', min: 20, max: Infinity },
  ]
  const packageDist = packageBuckets.map((b) => ({
    range: b.range,
    count: placed.filter((p) => (p.placementDetails?.package || 0) >= b.min && (p.placementDetails?.package || 0) < b.max).length,
  }))

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Placements</h1>
        <p className="text-aura-muted text-sm mt-1">Track and celebrate student placement achievements</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Placed', value: totalPlaced, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Avg Package', value: `${avgPackage} LPA`, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Highest Package', value: `${maxPackage} LPA`, icon: Award, color: 'text-aura-purple-light', bg: 'bg-aura-purple/10' },
          { label: 'Companies', value: Object.keys(companyMap).length, icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company-wise */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Top Recruiting Companies</h2>
          {companyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No placement data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Package distribution */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Package Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={packageDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Placement list */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : placed.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No placements recorded yet. Mark students as placed from the Students section.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold">Placed Students ({totalPlaced})</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {placed.map((p) => (
              <div key={p._id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-aura-muted">{p.placementDetails?.jobRole} @ {p.placementDetails?.companyName}</p>
                </div>
                {p.placementDetails?.package && (
                  <span className="text-sm font-bold text-emerald-400 flex-shrink-0">{p.placementDetails.package} LPA</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
