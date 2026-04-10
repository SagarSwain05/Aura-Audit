import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

const api = axios.create({ baseURL: BASE, withCredentials: true })

// Auto-attach JWT + optional user Gemini key
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aura_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    // Forward user-provided Gemini key for AI features
    const userKey = localStorage.getItem('aura_gemini_key')
    if (userKey) config.headers['x-user-gemini-key'] = userKey
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('aura_token')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  register: (data: Record<string, string>) => api.post('/api/auth/register', data),
  verifyEmail: (data: { email: string; otp: string }) => api.post('/api/auth/verify-email', data),
  resendOTP: (data: { email: string }) => api.post('/api/auth/resend-otp', data),
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data: Record<string, string>) => api.put('/api/auth/profile', data),
}

// ── Audit ──────────────────────────────────────────────
export const auditApi = {
  create: (formData: FormData) =>
    api.post('/api/audit', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: () => api.get('/api/audit'),
  getById: (id: string) => api.get(`/api/audit/${id}`),
  getStatus: (id: string) => api.get(`/api/audit/${id}/status`),
  delete: (id: string) => api.delete(`/api/audit/${id}`),
  generateRoadmap: (data: { skills: string[]; dreamRole: string; days?: number }) =>
    api.post('/api/audit/roadmap', data),
  generateInterview: (id: string, role: string) =>
    api.post(`/api/audit/${id}/interview`, { role }),
  enhanceBullet: (original: string, roleContext?: string) =>
    api.post('/api/audit/enhance-bullet', { original, roleContext }),
}

// ── Student ────────────────────────────────────────────
export const studentApi = {
  getProfile: () => api.get('/api/student/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/api/student/profile', data),
  getDashboard: () => api.get('/api/student/dashboard'),
  getLeaderboard: () => api.get('/api/student/leaderboard'),
  addSkill: (skill: { name: string; level: string }) => api.post('/api/student/skills', skill),
  updateSkill: (skillId: string, data: { level: string }) => api.put(`/api/student/skills/${skillId}`, data),
  removeSkill: (skillId: string) => api.delete(`/api/student/skills/${skillId}`),
  addCertification: (cert: Record<string, string>) => api.post('/api/student/certifications', cert),
  removeCertification: (certId: string) => api.delete(`/api/student/certifications/${certId}`),
  addProject: (project: Record<string, unknown>) => api.post('/api/student/projects', project),
  removeProject: (projectId: string) => api.delete(`/api/student/projects/${projectId}`),
}

// ── Jobs ───────────────────────────────────────────────
export const jobsApi = {
  getJobs: (params?: Record<string, string>) => api.get('/api/jobs', { params }),
  getJobById: (id: string) => api.get(`/api/jobs/${id}`),
  applyJob: (id: string) => api.post(`/api/jobs/${id}/apply`),
  getRecommended: () => api.get('/api/jobs/student/recommended'),
  createJob: (data: Record<string, unknown>) => api.post('/api/jobs', data),
  updateJob: (id: string, data: Record<string, unknown>) => api.put(`/api/jobs/${id}`, data),
  deleteJob: (id: string) => api.delete(`/api/jobs/${id}`),
  getApplications: (jobId: string) => api.get(`/api/jobs/${jobId}/applications`),
  updateApplicationStatus: (jobId: string, appId: string, data: Record<string, string>) =>
    api.put(`/api/jobs/${jobId}/applications/${appId}`, data),
  getMyApplications: () => api.get('/api/jobs/student/applications'),
  getLiveJobs: (params?: { location?: string; num_jobs?: string | number; role?: string }) =>
    api.get('/api/jobs/student/live', { params }),
}

// ── Assessment ─────────────────────────────────────────
export const assessmentApi = {
  generate: (data: { skill: string; level?: string }) => api.post('/api/assessment/generate', data),
  submit: (id: string, answers: Record<string, string>) => api.post(`/api/assessment/${id}/submit`, { answers }),
  getAll: () => api.get('/api/assessment'),
  getById: (id: string) => api.get(`/api/assessment/${id}`),
}

// ── Career ─────────────────────────────────────────────
export const careerApi = {
  getRecommendations: () => api.get('/api/career/recommendations'),
  getRoadmap: (role: string, days?: number) => api.post('/api/career/roadmap', { role, days }),
  getInterviewQuestions: () => api.get('/api/career/interview-questions'),
}

// ── Company ────────────────────────────────────────────
export const companyApi = {
  getDashboard: () => api.get('/api/company/dashboard'),
  getProfile: () => api.get('/api/company/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/api/company/profile', data),
  searchCandidates: (params: Record<string, string>) => api.get('/api/company/candidates', { params }),
  matchCandidates: (jobId: string) => api.post('/api/company/candidates/match', { jobId }),
  uploadKYC: (formData: FormData) =>
    api.post('/api/company/kyc', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ── University ─────────────────────────────────────────
export const universityApi = {
  getDashboard: () => api.get('/api/university/dashboard'),
  getProfile: () => api.get('/api/university/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/api/university/profile', data),
  getStudents: (params?: Record<string, string>) => api.get('/api/university/students', { params }),
  getStudentById: (id: string) => api.get(`/api/university/students/${id}`),
  updateStudent: (id: string, data: Record<string, unknown>) => api.put(`/api/university/students/${id}`, data),
  deleteStudent: (id: string) => api.delete(`/api/university/students/${id}`),
  batchUpload: (formData: FormData) =>
    api.post('/api/university/students/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getEmployabilityMetrics: () => api.get('/api/university/employability'),
  getAtRiskStudents: () => api.get('/api/university/intervention'),
  getPendingCompanies: () => api.get('/api/university/companies/pending'),
  verifyCompany: (id: string, data: { status: string; comment?: string }) =>
    api.put(`/api/university/companies/${id}/verify`, data),
}

// ── Notifications ──────────────────────────────────────
export const notificationsApi = {
  getAll: () => api.get('/api/notifications'),
  markRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/read-all'),
  delete: (id: string) => api.delete(`/api/notifications/${id}`),
}

export default api
