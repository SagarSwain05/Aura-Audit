'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, MessageSquare, Linkedin, MapPin, Briefcase, Search } from 'lucide-react'

// Static demo alumni data (Alumni model exists; real API would be GET /api/alumni)
const DEMO_ALUMNI = [
  { _id: '1', name: 'Priya Sharma', batch: 2022, company: 'Google', role: 'SDE II', location: 'Bangalore', mentorship: true, skills: ['React', 'Node.js', 'GCP'], linkedin: '#' },
  { _id: '2', name: 'Rahul Verma', batch: 2021, company: 'Microsoft', role: 'Software Engineer', location: 'Hyderabad', mentorship: true, skills: ['Python', 'Azure', 'ML'], linkedin: '#' },
  { _id: '3', name: 'Ananya Patel', batch: 2023, company: 'Flipkart', role: 'Data Scientist', location: 'Bangalore', mentorship: false, skills: ['Python', 'Spark', 'SQL'], linkedin: '#' },
  { _id: '4', name: 'Kiran Rao', batch: 2020, company: 'Infosys', role: 'Tech Lead', location: 'Pune', mentorship: true, skills: ['Java', 'Spring', 'Docker'], linkedin: '#' },
  { _id: '5', name: 'Meera Nair', batch: 2022, company: 'Amazon', role: 'SDE I', location: 'Chennai', mentorship: true, skills: ['JavaScript', 'AWS', 'React'], linkedin: '#' },
  { _id: '6', name: 'Arjun Singh', batch: 2021, company: 'Zomato', role: 'Backend Engineer', location: 'Delhi', mentorship: false, skills: ['Go', 'Kafka', 'Kubernetes'], linkedin: '#' },
]

export default function AlumniPage() {
  const [search, setSearch] = useState('')
  const [mentorOnly, setMentorOnly] = useState(false)

  const filtered = DEMO_ALUMNI.filter((a) => {
    if (mentorOnly && !a.mentorship) return false
    if (!search) return true
    return (
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Alumni Connect</h1>
        <p className="text-aura-muted text-sm mt-1">Connect with seniors for guidance and mentorship</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alumni, companies..." className="input-field pl-9 w-full" />
        </div>
        <button
          onClick={() => setMentorOnly(!mentorOnly)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mentorOnly ? 'border-aura-purple bg-aura-purple/10 text-aura-purple-light' : 'border-white/10 text-aura-muted hover:border-white/20'}`}
        >
          Mentors only
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((alumni, i) => (
          <motion.div
            key={alumni._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-aura-gradient flex items-center justify-center text-white font-bold">
                  {alumni.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{alumni.name}</p>
                  <p className="text-xs text-aura-muted">Batch {alumni.batch}</p>
                </div>
              </div>
              {alumni.mentorship && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Mentor</span>
              )}
            </div>

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-3.5 h-3.5 text-aura-muted" />
                <span>{alumni.role} @ {alumni.company}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-aura-muted">
                <MapPin className="w-3.5 h-3.5" />
                <span>{alumni.location}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {alumni.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 text-xs bg-white/5 text-aura-muted rounded-lg">{s}</span>
              ))}
            </div>

            <div className="flex gap-2">
              {alumni.mentorship && (
                <button className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Request Mentorship
                </button>
              )}
              <a href={alumni.linkedin} className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-aura-muted hover:text-aura-text transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-aura-muted">No alumni found matching your search</p>
        </div>
      )}
    </div>
  )
}
