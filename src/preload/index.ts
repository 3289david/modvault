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
  DownloadProgress
} from '../shared/types'

const api = {
  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: Partial<Settings>): Promise<void> => ipcRenderer.invoke('settings:save', s),

  // Instances
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

  // Mods
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

  // Search
  searchModrinth: (params: SearchParams): Promise<SearchResult> =>
    ipcRenderer.invoke('search:modrinth', params),
  searchCurseForge: (params: SearchParams): Promise<SearchResult> =>
    ipcRenderer.invoke('search:curseforge', params),
  getModrinthVersions: (
    projectId: string,
    loader?: string,
    mcVersion?: string
  ): Promise<ModVersion[]> => ipcRenderer.invoke('versions:modrinth', projectId, loader, mcVersion),
  getCurseForgeVersions: (
    modId: string,
    loader?: string,
    mcVersion?: string
  ): Promise<ModVersion[]> =>
    ipcRenderer.invoke('versions:curseforge', modId, loader, mcVersion),

  // Analysis
  detectConflicts: (instanceId: string): Promise<Conflict[]> =>
    ipcRenderer.invoke('analysis:conflicts', instanceId),
  analyzeCrashLog: (content: string): Promise<CrashAnalysis> =>
    ipcRenderer.invoke('analysis:crash', content),

  // System
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  openPath: (p: string) => ipcRenderer.invoke('system:open-path', p),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('system:select-folder'),
  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('system:select-file', filters),

  // Events
  onDownloadProgress: (cb: (p: DownloadProgress) => void) => {
    const handler = (_: unknown, p: DownloadProgress) => cb(p)
    ipcRenderer.on('download-progress', handler)
    return () => ipcRenderer.removeListener('download-progress', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
