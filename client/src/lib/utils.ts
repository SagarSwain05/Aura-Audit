import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-aura-green'
  if (score >= 60) return 'text-aura-cyan'
  if (score >= 40) return 'text-aura-amber'
  return 'text-aura-red'
}

export function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-aura-green to-emerald-400'
  if (score >= 60) return 'from-aura-cyan to-blue-400'
  if (score >= 40) return 'from-aura-amber to-orange-400'
  return 'from-aura-red to-rose-400'
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'border-red-500/40 bg-red-500/5'
    case 'warning': return 'border-amber-500/40 bg-amber-500/5'
    case 'improvement': return 'border-cyan-500/40 bg-cyan-500/5'
    default: return 'border-aura-border'
  }
}

export function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'improvement': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    default: return 'bg-aura-border text-aura-muted'
  }
}

export function getDemandColor(demand: string): string {
  switch (demand) {
    case 'hot': return 'text-red-400'
    case 'growing': return 'text-amber-400'
    case 'stable': return 'text-green-400'
    default: return 'text-aura-muted'
  }
}

export function getDemandIcon(demand: string): string {
  switch (demand) {
    case 'hot': return '🔥'
    case 'growing': return '📈'
    case 'stable': return '✅'
    default: return '—'
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'action_verb': return '⚡'
    case 'quantification': return '📊'
    case 'keyword': return '🔑'
    case 'impact': return '🎯'
    case 'formatting': return '📐'
    default: return '💡'
  }
}
