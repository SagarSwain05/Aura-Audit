'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { companyApi } from '@/lib/api'

const COLORS = ['#7C3AED', '#06B6D4', '#10b981', '#f59e0b', '#ef4444']

export default function CompanyAnalyticsPage() {
  const [dashboard, setDashboard] = useState<{
    company: { stats: { totalHired: number; activeJobs: number; totalApplications: number } }
    applicationsByStatus: Record<string, number>
    monthlyApplications: { month: string; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companyApi.getDashboard().then((r) => setDashboard(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
    </div>
  )

  const stats = dashboard?.company?.stats
  const statusData = Object.entries(dashboard?.applicationsByStatus || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
  const monthlyData = dashboard?.monthlyApplications || []

  const conversionRate = stats?.totalApplications
    ? Math.round((stats.totalHired / stats.totalApplications) * 100)
    : 0

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Jobs', value: stats?.activeJobs || 0 },
          { label: 'Total Applications', value: stats?.totalApplications || 0 },
          { label: 'Total Hired', value: stats?.totalHired || 0 },
          { label: 'Conversion Rate', value: `${conversionRate}%` },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-aura-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Applications by Status</h2>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Monthly Applications</h2>
          {monthlyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-aura-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e5e7eb' }} />
                <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
