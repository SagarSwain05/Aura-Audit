'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Eye, Palette, User, Briefcase, BookOpen,
  Award, Code, X, Loader2, Plus, Trash2,
} from 'lucide-react'
import { useAuditStore } from '@/store/useAuditStore'
import toast from 'react-hot-toast'

const TEMPLATES = [
  { id: 'modern',  name: 'Modern',  color: 'from-violet-600 to-cyan-500',    desc: 'Clean minimal layout' },
  { id: 'classic', name: 'Classic', color: 'from-slate-700 to-slate-500',    desc: 'Traditional ATS-friendly' },
  { id: 'bold',    name: 'Bold',    color: 'from-emerald-600 to-cyan-600',   desc: 'Stand-out design' },
  { id: 'minimal', name: 'Minimal', color: 'from-gray-600 to-gray-500',      desc: 'Minimalist white space' },
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

// ── Resume Preview HTML Component ─────────────────────────────────────────────
function ResumePreview({ data, template }: { data: ResumeData; template: string }) {
  const accent =
    template === 'modern'  ? '#7C3AED' :
    template === 'classic' ? '#1e40af' :
    template === 'bold'    ? '#059669' :
                             '#374151'

  const filled = data.skills.filter(Boolean)
  const filledExp = data.experience.filter(e => e.title || e.company)
  const filledEdu = data.education.filter(e => e.degree || e.institution)
  const filledProj = data.projects.filter(p => p.title)
  const filledCerts = data.certifications.filter(c => c.name)

  return (
    <div
      id="resume-preview"
      style={{
        fontFamily: template === 'classic' ? 'Georgia, serif' : "'Segoe UI', Arial, sans-serif",
        background: '#ffffff',
        color: '#1a1a1a',
        width: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm',
        boxSizing: 'border-box',
        fontSize: '10pt',
        lineHeight: '1.5',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: '10px', marginBottom: '14px' }}>
        <h1 style={{ margin: 0, fontSize: template === 'bold' ? '28pt' : '22pt', fontWeight: 900, color: accent, letterSpacing: '-0.5px' }}>
          {data.name || 'Your Name'}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', color: '#555', fontSize: '9pt' }}>
          {data.email    && <span>✉ {data.email}</span>}
          {data.phone    && <span>📞 {data.phone}</span>}
          {data.location && <span>📍 {data.location}</span>}
          {data.linkedin && <span>🔗 {data.linkedin.replace('https://', '')}</span>}
          {data.github   && <span>💻 {data.github.replace('https://', '')}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Professional Summary
          </h2>
          <p style={{ margin: 0, color: '#333' }}>{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {filledExp.length > 0 && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Work Experience
          </h2>
          {filledExp.map((exp, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '10.5pt', color: '#111' }}>{exp.title}</strong>
                <span style={{ fontSize: '9pt', color: '#666' }}>{exp.duration}</span>
              </div>
              <div style={{ color: accent, fontWeight: 600, fontSize: '9.5pt', marginBottom: '4px' }}>{exp.company}</div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#333' }}>
                {exp.bullets.filter(Boolean).map((b, j) => (
                  <li key={j} style={{ marginBottom: '2px' }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {filledEdu.length > 0 && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Education
          </h2>
          {filledEdu.map((edu, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div>
                <strong style={{ fontSize: '10.5pt' }}>{edu.degree}</strong>
                <div style={{ color: '#555', fontSize: '9.5pt' }}>{edu.institution}{edu.cgpa ? ` — CGPA: ${edu.cgpa}` : ''}</div>
              </div>
              <span style={{ fontSize: '9pt', color: '#666' }}>{edu.year}</span>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {filled.length > 0 && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Skills
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filled.map((s, i) => (
              <span key={i} style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}40`, borderRadius: '4px', padding: '2px 8px', fontSize: '9pt', fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {filledProj.length > 0 && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Projects
          </h2>
          {filledProj.map((proj, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '10.5pt' }}>{proj.title}</strong>
                {proj.tech && <span style={{ fontSize: '9pt', color: '#666' }}>| {proj.tech}</span>}
              </div>
              {proj.description && <p style={{ margin: '3px 0 0', color: '#333' }}>{proj.description}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {filledCerts.length > 0 && (
        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', borderBottom: `1px solid ${accent}40`, paddingBottom: '3px' }}>
            Certifications
          </h2>
          {filledCerts.map((cert, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span><strong>{cert.name}</strong>{cert.issuer ? ` — ${cert.issuer}` : ''}</span>
              <span style={{ color: '#666', fontSize: '9pt' }}>{cert.year}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ResumeBuilderPage() {
  const { user } = useAuditStore()
  const [template, setTemplate] = useState('modern')
  const [section, setSection] = useState('personal')
  const [showPreview, setShowPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<ResumeData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    linkedin: user?.linkedinUrl || '',
    github: user?.githubUrl || '',
    summary: '',
    experience: [{ title: '', company: '', duration: '', bullets: [''] }],
    education: [{ degree: '', institution: '', year: '', cgpa: '' }],
    skills: [''],
    projects: [{ title: '', tech: '', description: '' }],
    certifications: [{ name: '', issuer: '', year: '' }],
  })

  const SECTIONS = [
    { id: 'personal',       label: 'Personal',      icon: User },
    { id: 'summary',        label: 'Summary',       icon: FileText },
    { id: 'experience',     label: 'Experience',    icon: Briefcase },
    { id: 'education',      label: 'Education',     icon: BookOpen },
    { id: 'skills',         label: 'Skills',        icon: Code },
    { id: 'projects',       label: 'Projects',      icon: Palette },
    { id: 'certifications', label: 'Certificates',  icon: Award },
  ]

  const upd = (field: keyof ResumeData, value: unknown) => setData({ ...data, [field]: value })

  const handleDownload = async () => {
    if (!data.name) { toast.error('Please enter at least your name before downloading'); return }
    setDownloading(true)
    try {
      // Dynamically import heavy libs so they don't bloat initial bundle
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const el = document.getElementById('resume-preview')
      if (!el) { toast.error('Preview not found — click Preview first'); setDownloading(false); return }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width

      // If content overflows one page, add more pages
      const pageH = pdf.internal.pageSize.getHeight()
      let yPos = 0
      while (yPos < pdfH) {
        if (yPos > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, pdfH)
        yPos += pageH
      }

      const filename = `${(data.name || 'resume').replace(/\s+/g, '_')}_resume.pdf`
      pdf.save(filename)
      toast.success('Resume downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Download failed. Try the Preview → Print → Save as PDF option.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <p className="text-aura-muted text-sm mt-1">Build ATS-optimised resumes with 4 professional templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(true)} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Template picker */}
      <div>
        <p className="text-xs text-aura-muted mb-2 font-semibold uppercase tracking-wide">Choose Template</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={`glass-card p-3 text-center transition-all ${template === t.id ? 'border-aura-purple shadow-glow-purple' : 'hover:border-white/10'}`}>
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
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                section === s.id ? 'bg-aura-purple/20 text-aura-purple-light' : 'text-aura-muted hover:text-aura-text hover:bg-white/5'
              }`}>
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="lg:col-span-3 glass-card p-6">

          {section === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([['name','Full Name','text'],['email','Email','email'],['phone','Phone','tel'],['location','Location','text'],['linkedin','LinkedIn URL','url'],['github','GitHub URL','url']] as [keyof ResumeData, string, string][]).map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-sm text-aura-muted-light mb-1.5 block">{label}</label>
                  <input type={type} value={(data as Record<string, unknown>)[field] as string || ''}
                    onChange={(e) => upd(field, e.target.value)} className="input-field" />
                </div>
              ))}
            </div>
          )}

          {section === 'summary' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Professional Summary</label>
              <textarea value={data.summary} onChange={(e) => upd('summary', e.target.value)}
                placeholder="Brief overview of your expertise and goals..." rows={6}
                className="input-field resize-none w-full" />
              <p className="text-xs text-aura-muted mt-1.5">{data.summary.length}/300 characters recommended</p>
            </div>
          )}

          {section === 'skills' && (
            <div>
              <label className="text-sm text-aura-muted-light mb-1.5 block">Skills (comma separated)</label>
              <textarea value={data.skills.join(', ')}
                onChange={(e) => upd('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="React, TypeScript, Node.js, Python, AWS..." rows={5}
                className="input-field resize-none w-full" />
              {data.skills.filter(Boolean).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.skills.filter(Boolean).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-aura-purple/15 text-aura-purple-light rounded-full text-xs">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'experience' && (
            <div className="space-y-4">
              {data.experience.map((exp, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-aura-purple-light">Experience #{i + 1}</p>
                    {data.experience.length > 1 && (
                      <button onClick={() => upd('experience', data.experience.filter((_, j) => j !== i))}
                        className="text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Job Title</label>
                      <input type="text" value={exp.title} className="input-field text-sm"
                        onChange={(e) => { const u=[...data.experience]; u[i].title=e.target.value; upd('experience',u) }} />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Company</label>
                      <input type="text" value={exp.company} className="input-field text-sm"
                        onChange={(e) => { const u=[...data.experience]; u[i].company=e.target.value; upd('experience',u) }} />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Duration</label>
                      <input type="text" value={exp.duration} placeholder="Jun 2023 – Present" className="input-field text-sm"
                        onChange={(e) => { const u=[...data.experience]; u[i].duration=e.target.value; upd('experience',u) }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Bullet points (one per line)</label>
                    <textarea value={exp.bullets.join('\n')} rows={3} className="input-field resize-none w-full text-sm"
                      onChange={(e) => { const u=[...data.experience]; u[i].bullets=e.target.value.split('\n'); upd('experience',u) }} />
                  </div>
                </div>
              ))}
              <button onClick={() => upd('experience', [...data.experience, { title:'', company:'', duration:'', bullets:[''] }])}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Experience
              </button>
            </div>
          )}

          {section === 'education' && (
            <div className="space-y-4">
              {data.education.map((edu, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-aura-purple-light">Education #{i + 1}</p>
                    {data.education.length > 1 && (
                      <button onClick={() => upd('education', data.education.filter((_, j) => j !== i))}
                        className="text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([['degree','Degree / Program'],['institution','Institution'],['year','Year'],['cgpa','CGPA / Percentage']] as [keyof typeof edu, string][]).map(([field, label]) => (
                      <div key={field}>
                        <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                        <input type="text" value={edu[field] || ''} className="input-field text-sm"
                          onChange={(e) => { const u=[...data.education]; (u[i] as Record<string,string>)[field]=e.target.value; upd('education',u) }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => upd('education', [...data.education, { degree:'', institution:'', year:'', cgpa:'' }])}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Education
              </button>
            </div>
          )}

          {section === 'projects' && (
            <div className="space-y-4">
              {data.projects.map((proj, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-aura-purple-light">Project #{i + 1}</p>
                    {data.projects.length > 1 && (
                      <button onClick={() => upd('projects', data.projects.filter((_, j) => j !== i))}
                        className="text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Project Title</label>
                      <input type="text" value={proj.title} className="input-field text-sm"
                        onChange={(e) => { const u=[...data.projects]; u[i].title=e.target.value; upd('projects',u) }} />
                    </div>
                    <div>
                      <label className="text-xs text-aura-muted mb-1 block">Tech Stack</label>
                      <input type="text" value={proj.tech} placeholder="React, Node, MongoDB" className="input-field text-sm"
                        onChange={(e) => { const u=[...data.projects]; u[i].tech=e.target.value; upd('projects',u) }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-aura-muted mb-1 block">Description</label>
                    <textarea value={proj.description} rows={2} className="input-field resize-none w-full text-sm"
                      onChange={(e) => { const u=[...data.projects]; u[i].description=e.target.value; upd('projects',u) }} />
                  </div>
                </div>
              ))}
              <button onClick={() => upd('projects', [...data.projects, { title:'', tech:'', description:'' }])}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
          )}

          {section === 'certifications' && (
            <div className="space-y-4">
              {data.certifications.map((cert, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-aura-purple-light">Certificate #{i + 1}</p>
                    {data.certifications.length > 1 && (
                      <button onClick={() => upd('certifications', data.certifications.filter((_, j) => j !== i))}
                        className="text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([['name','Certificate Name'],['issuer','Issuing Org'],['year','Year']] as [keyof typeof cert, string][]).map(([field, label]) => (
                      <div key={field}>
                        <label className="text-xs text-aura-muted mb-1 block">{label}</label>
                        <input type="text" value={cert[field] || ''} className="input-field text-sm"
                          onChange={(e) => { const u=[...data.certifications]; (u[i] as Record<string,string>)[field]=e.target.value; upd('certifications',u) }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => upd('certifications', [...data.certifications, { name:'', issuer:'', year:'' }])}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Certificate
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Hidden resume div used by html2canvas — always rendered, just off-screen */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }} aria-hidden>
        <ResumePreview data={data} template={template} />
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative mt-8 mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal controls */}
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-white/70 text-sm font-medium">Resume Preview — {TEMPLATES.find(t => t.id === template)?.name}</p>
                <div className="flex gap-2">
                  <button onClick={handleDownload} disabled={downloading}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button onClick={() => setShowPreview(false)} className="btn-secondary p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scaled-down preview for screen */}
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', width: '210mm', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
                ref={previewRef}>
                <ResumePreview data={data} template={template} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
