import { create } from 'zustand'
import type {
  Instance,
  InstalledMod,
  Conflict,
  Settings,
  DownloadProgress,
  SearchResult,
  AuthProfile,
  LaunchProgress,
  GameLogEntry
} from '@shared/types'

interface AppState {
  // Instances
  instances: Instance[]
  activeInstanceId: string | null
  instancesLoaded: boolean

  // Mods
  installedMods: Record<string, InstalledMod[]>
  conflicts: Record<string, Conflict[]>

  // Downloads
  downloads: Record<string, DownloadProgress>

  // Search
  searchResults: SearchResult | null
  searchLoading: boolean

  // Settings
  settings: Settings | null
  settingsLoaded: boolean

  // Auth
  auth: AuthProfile | null
  authLoaded: boolean

  // Launch
  launchProgress: Record<string, LaunchProgress>
  runningInstances: string[]
  gameLogs: Record<string, GameLogEntry[]>

  // UI
  sidebarCollapsed: boolean
  showAuthModal: boolean
  showConsole: string | null  // instanceId whose console is open

  // Actions
  setInstances: (instances: Instance[]) => void
  setActiveInstance: (id: string | null) => void
  setInstalledMods: (instanceId: string, mods: InstalledMod[]) => void
  setConflicts: (instanceId: string, conflicts: Conflict[]) => void
  setDownloadProgress: (p: DownloadProgress) => void
  removeDownload: (modId: string) => void
  setSearchResults: (r: SearchResult | null) => void
  setSearchLoading: (v: boolean) => void
  setSettings: (s: Settings) => void
  setSidebarCollapsed: (v: boolean) => void
  upsertInstance: (instance: Instance) => void
  removeInstance: (id: string) => void
  addInstalledMod: (instanceId: string, mod: InstalledMod) => void
  removeInstalledMod: (instanceId: string, fileId: string) => void
  updateInstalledMod: (instanceId: string, fileId: string, patch: Partial<InstalledMod>) => void
  setAuth: (auth: AuthProfile | null) => void
  setLaunchProgress: (p: LaunchProgress) => void
  clearLaunchProgress: (instanceId: string) => void
  addGameLog: (entry: GameLogEntry) => void
  clearGameLogs: (instanceId: string) => void
  setGameRunning: (instanceId: string, running: boolean) => void
  setShowAuthModal: (v: boolean) => void
  setShowConsole: (instanceId: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  instances: [],
  activeInstanceId: null,
  instancesLoaded: false,
  installedMods: {},
  conflicts: {},
  downloads: {},
  searchResults: null,
  searchLoading: false,
  settings: null,
  settingsLoaded: false,
  auth: null,
  authLoaded: false,
  launchProgress: {},
  runningInstances: [],
  gameLogs: {},
  sidebarCollapsed: false,
  showAuthModal: false,
  showConsole: null,

  setInstances: (instances) => set({ instances, instancesLoaded: true }),
  setActiveInstance: (activeInstanceId) => set({ activeInstanceId }),
  setInstalledMods: (instanceId, mods) =>
    set((s) => ({ installedMods: { ...s.installedMods, [instanceId]: mods } })),
  setConflicts: (instanceId, conflicts) =>
    set((s) => ({ conflicts: { ...s.conflicts, [instanceId]: conflicts } })),
  setDownloadProgress: (p) =>
    set((s) => ({ downloads: { ...s.downloads, [p.modId]: p } })),
  removeDownload: (modId) =>
    set((s) => {
      const { [modId]: _, ...rest } = s.downloads
      return { downloads: rest }
    }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchLoading: (searchLoading) => set({ searchLoading }),
  setSettings: (settings) => set({ settings, settingsLoaded: true }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  upsertInstance: (instance) =>
    set((s) => {
      const idx = s.instances.findIndex((i) => i.id === instance.id)
      if (idx >= 0) {
        const next = [...s.instances]
        next[idx] = instance
        return { instances: next }
      }
      return { instances: [...s.instances, instance] }
    }),
  removeInstance: (id) =>
    set((s) => ({
      instances: s.instances.filter((i) => i.id !== id),
      activeInstanceId: s.activeInstanceId === id ? null : s.activeInstanceId
    })),
  addInstalledMod: (instanceId, mod) =>
    set((s) => {
      const existing = s.installedMods[instanceId] ?? []
      const filtered = existing.filter((m) => m.fileId !== mod.fileId)
      return { installedMods: { ...s.installedMods, [instanceId]: [...filtered, mod] } }
    }),
  removeInstalledMod: (instanceId, fileId) =>
    set((s) => ({
      installedMods: {
        ...s.installedMods,
        [instanceId]: (s.installedMods[instanceId] ?? []).filter((m) => m.fileId !== fileId)
      }
    })),
  updateInstalledMod: (instanceId, fileId, patch) =>
    set((s) => ({
      installedMods: {
        ...s.installedMods,
        [instanceId]: (s.installedMods[instanceId] ?? []).map((m) =>
          m.fileId === fileId ? { ...m, ...patch } : m
        )
      }
    })),

  setAuth: (auth) => set({ auth, authLoaded: true }),

  setLaunchProgress: (p) =>
    set((s) => ({ launchProgress: { ...s.launchProgress, [p.instanceId]: p } })),
  clearLaunchProgress: (instanceId) =>
    set((s) => {
      const { [instanceId]: _, ...rest } = s.launchProgress
      return { launchProgress: rest }
    }),

  addGameLog: (entry) =>
    set((s) => {
      const existing = s.gameLogs[entry.instanceId] ?? []
      // Keep last 500 lines per instance
      const next = [...existing, entry].slice(-500)
      return { gameLogs: { ...s.gameLogs, [entry.instanceId]: next } }
    }),
  clearGameLogs: (instanceId) =>
    set((s) => ({ gameLogs: { ...s.gameLogs, [instanceId]: [] } })),

  setGameRunning: (instanceId, running) =>
    set((s) => ({
      runningInstances: running
        ? [...s.runningInstances.filter((id) => id !== instanceId), instanceId]
        : s.runningInstances.filter((id) => id !== instanceId)
    })),

  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setShowConsole: (showConsole) => set({ showConsole })
}))

// Selectors
export const selectActiveInstance = (s: AppState) =>
  s.instances.find((i) => i.id === s.activeInstanceId) ?? null

export const selectInstalledMods = (s: AppState) =>
  s.activeInstanceId ? (s.installedMods[s.activeInstanceId] ?? []) : []

export const selectConflicts = (s: AppState) =>
  s.activeInstanceId ? (s.conflicts[s.activeInstanceId] ?? []) : []

export const selectActiveDownloads = (s: AppState) =>
  Object.values(s.downloads).filter((d) => d.status === 'downloading' || d.status === 'installing')
