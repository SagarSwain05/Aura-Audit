'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Eye, Palette, User, Briefcase, BookOpen, Award, Code } from 'lucide-react'
import { useAuditStore } from '@/store/useAuditStore'

const TEMPLATES = [
  { id: 'modern', name: 'Modern', color: 'from-aura-purple to-aura-cyan', desc: 'Clean minimal layout' },
  { id: 'classic', name: 'Classic', color: 'from-slate-700 to-slate-600', desc: 'Traditional ATS-friendly' },
  { id: 'bold', name: 'Bold', color: 'from-emerald-600 to-cyan-600', desc: 'Stand-out design' },
  { id: 'minimal', name: 'Minimal', color: 'from-gray-700 to-gray-600', desc: 'Minimalist white space' },
]

interface ResumeData {
  name: string; email: string; phone: string; location: string; linkedin: string; github: string
  summary: string
  experience: { title: string; company: string; duration: string; bullets: string[] }[]
  education: { degree: string; institution: string; year: string; cgpa: string }[]
  skills: string[]
  projects: { title: string; tech: string; description: string }[]
  certifications: { name: string; issuer: string; year: string }[]
}

export default function ResumeBuilderPage() {
  const { user } = useAuditStore()
  const [template, setTemplate] = useState('modern')
  const [section, setSection] = useState('personal')
  const [data, setData] = useState<ResumeData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    summary: '',
    experience: [{ title: '', company: '', duration: '', bullets: [''] }],
    education: [{ degree: '', institution: '', year: '', cgpa: '' }],
    skills: [''],
    projects: [{ title: '', tech: '', description: '' }],
    certifications: [{ name: '', issuer: '', year: '' }],
  })

  const SECTIONS = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: BookOpen },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'projects', label: 'Projects', icon: Palette },
    { id: 'certifications', label: 'Certificates', icon: Award },
  ]

  const updateField = (field: keyof ResumeData, value: unknown) => {
    setData({ ...data, [field]: value })
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <p className="text-aura-muted text-sm mt-1">Build ATS-optimised resumes with 4 professional templates</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Template picker */}
      <div>
        <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide">Choose Template</p>
        <div className="grid grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`glass-card p-3 text-center transition-all ${template === t.id ? 'border-aura-purple shadow-glow-purple' : 'hover:border-white/10'}`}
            >
              <div className={`h-10 rounded-lg bg-gradient-to-br ${t.color} mb-2`} />
              <p className="text-xs font-semibold">{t.name}</p>
              <p className="text-xs text-aura-muted">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Section nav */}
        <div className="glass-card p-3 space-y-0.5 h-fit">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                section === s.id ? 'bg-aura-purple/20 text-aura-purple-light' : 'text-aura-muted hover:text-aura-text hover:bg-white/5'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="lg:col-span-3 glass-card p-6">
          {section === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['name', 'Full Name', 'text'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel'],
                ['location', 'Location', 'text'],
                ['linkedin', 'LinkedIn URL', 'url'],
                ['github', 'GitHub URL', 'url'],
              ].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                  <input
                    type={type}
                    value={(data as unknown as Record<string, string>)[field] || ''}
                    onChange={(e) => updateField(field as keyof ResumeData, e.target.value)}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
          )}

          {section === 'summary' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Professional Summary</label>
              <textarea
                value={data.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Brief overview of your expertise and goals..."
                rows={5}
                className="input-field resize-none w-full"
              />
              <p className="text-xs text-aura-muted mt-1.5">{data.summary.length}/300 characters recommended</p>
            </div>
          )}

          {section === 'skills' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Skills (comma separated or one per line)</label>
              <textarea
                value={data.skills.join(', ')}
                onChange={(e) => updateField('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="React, TypeScript, Node.js, Python, AWS..."
                rows={5}
                className="input-field resize-none w-full"
              />
            </div>
          )}

          {section === 'experience' && (
            <div className="space-y-4">
              {data.experience.map((exp, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-aura-purple-light">Experience #{i + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Job Title</label>
                      <input type="text" value={exp.title} onChange={(e) => {
                        const updated = [...data.experience]; updated[i].title = e.target.value; updateField('experience', updated)
                      }} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Company</label>
                      <input type="text" value={exp.company} onChange={(e) => {
                        const updated = [...data.experience]; updated[i].company = e.target.value; updateField('experience', updated)
                      }} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Duration</label>
                      <input type="text" value={exp.duration} placeholder="Jun 2023 – Present" onChange={(e) => {
                        const updated = [...data.experience]; updated[i].duration = e.target.value; updateField('experience', updated)
                      }} className="input-field text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Bullet points (one per line)</label>
                    <textarea
                      value={exp.bullets.join('\n')}
                      onChange={(e) => {
                        const updated = [...data.experience]; updated[i].bullets = e.target.value.split('\n'); updateField('experience', updated)
                      }}
                      rows={3}
                      className="input-field resize-none w-full text-sm"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => updateField('experience', [...data.experience, { title: '', company: '', duration: '', bullets: [''] }])}
                className="btn-secondary w-full text-sm py-2"
              >
                + Add Experience
              </button>
            </div>
          )}

          {section === 'education' && (
            <div className="space-y-4">
              {data.education.map((edu, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['degree', 'Degree / Program'],
                      ['institution', 'Institution'],
                      ['year', 'Year'],
                      ['cgpa', 'CGPA / Percentage'],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                        <input type="text" value={(edu as Record<string, string>)[field] || ''} onChange={(e) => {
                          const updated = [...data.education]; (updated[i] as Record<string, string>)[field] = e.target.value; updateField('education', updated)
                        }} className="input-field text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => updateField('education', [...data.education, { degree: '', institution: '', year: '', cgpa: '' }])} className="btn-secondary w-full text-sm py-2">
                + Add Education
              </button>
            </div>
          )}

          {section === 'projects' && (
            <div className="space-y-4">
              {data.projects.map((proj, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Project Title</label>
                      <input type="text" value={proj.title} onChange={(e) => {
                        const updated = [...data.projects]; updated[i].title = e.target.value; updateField('projects', updated)
                      }} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Tech Stack</label>
                      <input type="text" value={proj.tech} placeholder="React, Node, MongoDB" onChange={(e) => {
                        const updated = [...data.projects]; updated[i].tech = e.target.value; updateField('projects', updated)
                      }} className="input-field text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Description</label>
                    <textarea value={proj.description} rows={2} onChange={(e) => {
                      const updated = [...data.projects]; updated[i].description = e.target.value; updateField('projects', updated)
                    }} className="input-field resize-none w-full text-sm" />
                  </div>
                </div>
              ))}
              <button onClick={() => updateField('projects', [...data.projects, { title: '', tech: '', description: '' }])} className="btn-secondary w-full text-sm py-2">
                + Add Project
              </button>
            </div>
          )}

          {section === 'certifications' && (
            <div className="space-y-4">
              {data.certifications.map((cert, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl">
                  <div className="grid grid-cols-3 gap-3">
                    {[['name', 'Certificate Name'], ['issuer', 'Issuing Org'], ['year', 'Year']].map(([field, label]) => (
                      <div key={field}>
                        <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                        <input type="text" value={(cert as Record<string, string>)[field] || ''} onChange={(e) => {
                          const updated = [...data.certifications]; (updated[i] as Record<string, string>)[field] = e.target.value; updateField('certifications', updated)
                        }} className="input-field text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => updateField('certifications', [...data.certifications, { name: '', issuer: '', year: '' }])} className="btn-secondary w-full text-sm py-2">
                + Add Certificate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
