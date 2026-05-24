import { contextBridge, ipcRenderer } from 'electron'
import type {
  Instance,
  CreateInstanceConfig,
  Settings,
  SearchParams,
  InstalledMod,
  InstallModParams,
  Conflict,
  CrashAnalysis,
  SearchResult,
  ModVersion,
  DownloadProgress,
  AuthProfile,
  LaunchProgress,
  GameLogEntry,
  MinecraftVersion,
  LoaderVersionInfo
} from '../shared/types'

const api = {
  // ── Window ──────────────────────────────────────────────────────────────────
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // ── Settings ─────────────────────────────────────────────────────────────────
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: Partial<Settings>): Promise<void> => ipcRenderer.invoke('settings:save', s),

  // ── Instances ─────────────────────────────────────────────────────────────────
  getAllInstances: (): Promise<Instance[]> => ipcRenderer.invoke('instances:get-all'),
  createInstance: (c: CreateInstanceConfig): Promise<Instance> =>
    ipcRenderer.invoke('instances:create', c),
  updateInstance: (id: string, patch: Partial<Instance>): Promise<Instance> =>
    ipcRenderer.invoke('instances:update', id, patch),
  deleteInstance: (id: string): Promise<void> => ipcRenderer.invoke('instances:delete', id),
  openInstanceFolder: (id: string): Promise<void> =>
    ipcRenderer.invoke('instances:open-folder', id),
  refreshModCount: (id: string): Promise<number> =>
    ipcRenderer.invoke('instances:refresh-count', id),

  // ── Mods ──────────────────────────────────────────────────────────────────────
  getInstalledMods: (instanceId: string): Promise<InstalledMod[]> =>
    ipcRenderer.invoke('mods:get-installed', instanceId),
  installMod: (params: InstallModParams): Promise<InstalledMod> =>
    ipcRenderer.invoke('mods:install', params),
  uninstallMod: (instanceId: string, fileId: string): Promise<void> =>
    ipcRenderer.invoke('mods:uninstall', instanceId, fileId),
  toggleMod: (instanceId: string, fileId: string, enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('mods:toggle', instanceId, fileId, enabled),
  importLocalMod: (instanceId: string): Promise<InstalledMod | null> =>
    ipcRenderer.invoke('mods:import-local', instanceId),
  applyToMinecraft: (instanceId: string): Promise<{ copied: number; targetDir: string }> =>
    ipcRenderer.invoke('mods:apply-to-minecraft', instanceId),

  // ── Search ────────────────────────────────────────────────────────────────────
  searchModrinth: (params: SearchParams): Promise<SearchResult> =>
    ipcRenderer.invoke('search:modrinth', params),
  searchCurseForge: (params: SearchParams): Promise<SearchResult> =>
    ipcRenderer.invoke('search:curseforge', params),
  getModrinthVersions: (
    projectId: string,
    loader?: string,
    mcVersion?: string
  ): Promise<ModVersion[]> =>
    ipcRenderer.invoke('versions:modrinth', projectId, loader, mcVersion),
  getCurseForgeVersions: (
    modId: string,
    loader?: string,
    mcVersion?: string
  ): Promise<ModVersion[]> =>
    ipcRenderer.invoke('versions:curseforge', modId, loader, mcVersion),

  // ── Analysis ──────────────────────────────────────────────────────────────────
  detectConflicts: (instanceId: string): Promise<Conflict[]> =>
    ipcRenderer.invoke('analysis:conflicts', instanceId),
  analyzeCrashLog: (content: string): Promise<CrashAnalysis> =>
    ipcRenderer.invoke('analysis:crash', content),

  // ── Auth ──────────────────────────────────────────────────────────────────────
  getAuth: (): Promise<AuthProfile | null> => ipcRenderer.invoke('auth:get'),
  loginMicrosoft: (): Promise<AuthProfile> => ipcRenderer.invoke('auth:microsoft-login'),
  loginOffline: (username: string): Promise<AuthProfile> =>
    ipcRenderer.invoke('auth:offline-login', username),
  logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
  refreshAuth: (): Promise<AuthProfile | null> => ipcRenderer.invoke('auth:refresh'),

  // ── Java ──────────────────────────────────────────────────────────────────────
  detectJava: (mcVersion?: string): Promise<{ path: string; version: string; source: string } | null> =>
    ipcRenderer.invoke('java:detect', mcVersion),

  // ── Minecraft + loader versions ───────────────────────────────────────────────
  getMinecraftVersions: (): Promise<MinecraftVersion[]> => ipcRenderer.invoke('versions:minecraft'),
  getLoaderVersions: (loader: string, mcVersion: string): Promise<LoaderVersionInfo[]> =>
    ipcRenderer.invoke('versions:loader', loader, mcVersion),

  // ── Loader install ────────────────────────────────────────────────────────────
  installLoader: (instanceId: string): Promise<{ versionId: string; loaderVersion: string }> =>
    ipcRenderer.invoke('loader:install', instanceId),

  // ── Launch ────────────────────────────────────────────────────────────────────
  launchInstance: (instanceId: string): Promise<void> =>
    ipcRenderer.invoke('launch:start', instanceId),
  stopInstance: (instanceId: string): Promise<void> =>
    ipcRenderer.invoke('launch:stop', instanceId),
  isInstanceRunning: (instanceId: string): Promise<boolean> =>
    ipcRenderer.invoke('launch:is-running', instanceId),
  getRunningInstances: (): Promise<string[]> => ipcRenderer.invoke('launch:running-ids'),

  // ── System ────────────────────────────────────────────────────────────────────
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  openPath: (p: string) => ipcRenderer.invoke('system:open-path', p),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('system:select-folder'),
  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('system:select-file', filters),

  // ── Events ────────────────────────────────────────────────────────────────────
  onDownloadProgress: (cb: (p: DownloadProgress) => void) => {
    const h = (_: unknown, p: DownloadProgress) => cb(p)
    ipcRenderer.on('download-progress', h)
    return () => ipcRenderer.removeListener('download-progress', h)
  },
  onLaunchProgress: (cb: (p: LaunchProgress) => void) => {
    const h = (_: unknown, p: LaunchProgress) => cb(p)
    ipcRenderer.on('launch-progress', h)
    return () => ipcRenderer.removeListener('launch-progress', h)
  },
  onGameLog: (cb: (entry: GameLogEntry) => void) => {
    const h = (_: unknown, e: GameLogEntry) => cb(e)
    ipcRenderer.on('game-log', h)
    return () => ipcRenderer.removeListener('game-log', h)
  },
  onGameStarted: (cb: (data: { instanceId: string }) => void) => {
    const h = (_: unknown, d: { instanceId: string }) => cb(d)
    ipcRenderer.on('game-started', h)
    return () => ipcRenderer.removeListener('game-started', h)
  },
  onGameClosed: (cb: (data: { instanceId: string; code: number }) => void) => {
    const h = (_: unknown, d: { instanceId: string; code: number }) => cb(d)
    ipcRenderer.on('game-closed', h)
    return () => ipcRenderer.removeListener('game-closed', h)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
