import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Audit, User, LearningRoadmap } from '@/types'

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

interface AuditState {
  // Auth
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void

  // Current audit
  currentAudit: Audit | null
  setCurrentAudit: (audit: Audit | null) => void
  updateRedlineAccepted: (lineIndex: number, accepted: boolean) => void

  // Audit history
  audits: Partial<Audit>[]
  setAudits: (audits: Partial<Audit>[]) => void

  // Roadmap
  roadmap: LearningRoadmap | null
  setRoadmap: (roadmap: LearningRoadmap | null) => void
  completedDays: Set<number>
  toggleDayComplete: (day: number) => void

  // Notifications
  notifications: Notification[]
  setNotifications: (n: Notification[]) => void
  unreadCount: number
  setUnreadCount: (n: number) => void

  // UI state
  uploadProgress: number
  setUploadProgress: (n: number) => void
  isAnalyzing: boolean
  setIsAnalyzing: (b: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          token ? localStorage.setItem('aura_token', token) : localStorage.removeItem('aura_token')
        }
        set({ token })
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('aura_token')
        set({ user: null, token: null, currentAudit: null, audits: [], notifications: [], unreadCount: 0 })
      },

      // Audit
      currentAudit: null,
      setCurrentAudit: (audit) => set({ currentAudit: audit }),
      updateRedlineAccepted: (lineIndex, accepted) =>
        set((state) => ({
          currentAudit: state.currentAudit
            ? {
                ...state.currentAudit,
                redlines: state.currentAudit.redlines.map((r) =>
                  r.line_index === lineIndex ? { ...r, accepted } : r
                ),
              }
            : null,
        })),

      // History
      audits: [],
      setAudits: (audits) => set({ audits }),

      // Roadmap
      roadmap: null,
      setRoadmap: (roadmap) => set({ roadmap }),
      completedDays: new Set(),
      toggleDayComplete: (day) =>
        set((state) => {
          const next = new Set(state.completedDays)
          next.has(day) ? next.delete(day) : next.add(day)
          return { completedDays: next }
        }),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      unreadCount: 0,
      setUnreadCount: (unreadCount) => set({ unreadCount }),

      // UI
      uploadProgress: 0,
      setUploadProgress: (n) => set({ uploadProgress: n }),
      isAnalyzing: false,
      setIsAnalyzing: (b) => set({ isAnalyzing: b }),
      activeTab: 'audit',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'aura-audit-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        audits: state.audits,
        completedDays: Array.from(state.completedDays),
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      // Rehydrate completedDays as Set (JSON stores it as array)
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AuditState>),
        completedDays: new Set(
          Array.isArray((persisted as Record<string, unknown>).completedDays)
            ? ((persisted as Record<string, unknown>).completedDays as number[])
            : []
        ),
      }),
    }
  )
)
