import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { Instance, InstalledMod, Settings } from '../shared/types'

interface StoreData {
  settings: Partial<Settings>
  instances: Instance[]
  installedMods: Record<string, InstalledMod[]>
}

const DEFAULT_SETTINGS: Settings = {
  minecraftPath: path.join(app.getPath('appData'), '.minecraft'),
  curseforgeApiKey: '',
  defaultLoader: 'fabric',
  autoCheckConflicts: true,
  theme: 'dark',
  dataDir: path.join(app.getPath('userData'))
}

class Store {
  private data: StoreData
  private filePath: string
  readonly dataDir: string

  constructor() {
    this.dataDir = path.join(app.getPath('userData'))
    this.filePath = path.join(this.dataDir, 'data.json')
    fs.mkdirSync(this.dataDir, { recursive: true })
    this.data = this.load()
  }

  private load(): StoreData {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return { settings: {}, instances: [], installedMods: {} }
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }

  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.data.settings }
  }

  saveSettings(settings: Partial<Settings>) {
    this.data.settings = { ...this.data.settings, ...settings }
    this.save()
  }

  getInstances(): Instance[] {
    return this.data.instances ?? []
  }

  saveInstances(instances: Instance[]) {
    this.data.instances = instances
    this.save()
  }

  getInstalledMods(instanceId: string): InstalledMod[] {
    return this.data.installedMods?.[instanceId] ?? []
  }

  saveInstalledMods(instanceId: string, mods: InstalledMod[]) {
    if (!this.data.installedMods) this.data.installedMods = {}
    this.data.installedMods[instanceId] = mods
    this.save()
  }
}

export const store = new Store()
