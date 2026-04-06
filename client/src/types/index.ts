export interface AuraScore {
  technical_density: number
  impact_quotient: number
  formatting_health: number
  ats_compatibility: number
  overall: number
}

export interface Redline {
  original: string
  suggestion: string
  reason: string
  category: 'action_verb' | 'quantification' | 'keyword' | 'impact' | 'formatting'
  severity: 'critical' | 'warning' | 'improvement'
  line_index: number
  accepted?: boolean
}

export interface JobMatch {
  title: string
  match_percentage: number
  matched_skills: string[]
  missing_skills: string[]
  salary_range: string
  demand_level: 'hot' | 'growing' | 'stable'
}

export interface SkillGap {
  skill: string
  importance: 'critical' | 'high' | 'medium'
  category: 'technical' | 'tools' | 'soft'
  transferable_from?: string
}

export interface GapAnalysis {
  dream_role: string
  readiness_score: number
  gaps: SkillGap[]
  strengths: string[]
  transferable_skills: string[]
}

export interface LearningResource {
  title: string
  url: string
  platform: 'youtube' | 'coursera' | 'docs' | 'project'
  duration: string
  thumbnail?: string
  type: 'video' | 'course' | 'article' | 'project_idea'
}

export interface RoadmapDay {
  day: number
  topic: string
  goal: string
  resources: LearningResource[]
  project_idea?: string
}

export interface LearningRoadmap {
  skill: string
  total_days: number
  days: RoadmapDay[]
}

export interface InterviewQuestion {
  question: string
  category: 'technical' | 'behavioral' | 'project' | 'system_design'
  difficulty: 'easy' | 'medium' | 'hard'
  hint: string
}

export interface Audit {
  _id: string
  user: string
  resumeUrl: string
  originalFilename: string
  auraScore: AuraScore
  redlines: Redline[]
  jobMatches: JobMatch[]
  extractedSkills: string[]
  extractedExperience: string[]
  dreamRole: string
  gapAnalysis: GapAnalysis | null
  marketDemand: Record<string, number>
  marketMeta: {
    trending: string[]
    hot_cities: Record<string, string[]>
  }
  interviewQuestions: InterviewQuestion[]
  resumeMeta: {
    pages: number
    word_count: number
    metrics_count: { percentages: number; numbers: number; total_metrics: number }
    weak_verbs_count: number
  }
  status: 'processing' | 'completed' | 'failed'
  blindMode: boolean
  createdAt: string
}

export interface User {
  _id: string
  name: string
  email: string
  role: 'student' | 'tpo' | 'admin'
  dreamRole: string
  bestAuraScore: number
  totalAudits: number
  linkedinUrl: string
  githubUrl: string
}
