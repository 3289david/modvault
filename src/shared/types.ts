export type LoaderType = 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'vanilla'

export interface Instance {
  id: string
  name: string
  minecraftVersion: string
  loader: LoaderType
  loaderVersion: string
  modsFolder: string
  icon?: string
  description?: string
  createdAt: string
  lastPlayed?: string
  modCount?: number
}

export interface CreateInstanceConfig {
  name: string
  minecraftVersion: string
  loader: LoaderType
  loaderVersion?: string
  description?: string
  modsFolder?: string
}

export interface ModDependency {
  id: string
  name?: string
  required: boolean
  versionRange?: string
}

export interface InstalledMod {
  id: string
  fileId: string
  name: string
  version: string
  description: string
  loaders: LoaderType[]
  mcVersions: string[]
  enabled: boolean
  filePath: string
  fileName: string
  dependencies: ModDependency[]
  source: 'modrinth' | 'curseforge' | 'manual'
  sourceId?: string
  projectId?: string
  iconUrl?: string
  categories: string[]
  authors: string[]
  installDate: string
  fileSize?: number
}

export interface ModSearchHit {
  id: string
  slug: string
  title: string
  description: string
  author: string
  iconUrl?: string
  downloads: number
  followers?: number
  categories: string[]
  loaders: string[]
  versions: string[]
  source: 'modrinth' | 'curseforge'
  latestVersion?: string
  updatedAt?: string
}

export interface ModVersion {
  id: string
  name: string
  versionNumber: string
  gameVersions: string[]
  loaders: string[]
  files: ModVersionFile[]
  dependencies: ModDependency[]
  releaseType: 'release' | 'beta' | 'alpha'
  datePublished: string
  downloads: number
}

export interface ModVersionFile {
  url: string
  filename: string
  primary: boolean
  size: number
}

export interface SearchParams {
  query: string
  loader?: string
  mcVersion?: string
  category?: string
  offset?: number
  limit?: number
}

export interface SearchResult {
  hits: ModSearchHit[]
  total: number
  offset: number
  limit: number
}

export interface Conflict {
  mod1Id: string
  mod1Name: string
  mod2Id: string
  mod2Name: string
  type: 'incompatible' | 'duplicate' | 'api_conflict' | 'missing_dep'
  severity: 'error' | 'warning' | 'info'
  description: string
  resolution?: string
}

export interface CrashAnalysis {
  primaryCause: string
  causeType: 'mod_conflict' | 'missing_dep' | 'java_error' | 'oom' | 'mixin_error' | 'unknown'
  suspects: CrashSuspect[]
  recommendations: string[]
  stackTrace?: string
  timestamp?: string
  mcVersion?: string
  loaderVersion?: string
}

export interface CrashSuspect {
  name: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface InstallModParams {
  instanceId: string
  modId: string
  versionId: string
  source: 'modrinth' | 'curseforge'
  fileName?: string
  downloadUrl?: string
}

export interface DownloadProgress {
  modId: string
  fileName: string
  progress: number
  speed?: number
  status: 'downloading' | 'installing' | 'done' | 'error'
}

export interface Settings {
  minecraftPath: string
  curseforgeApiKey: string
  defaultLoader: LoaderType
  autoCheckConflicts: boolean
  theme: 'dark' | 'light'
  dataDir: string
}

export const MC_VERSIONS = [
  '1.21.4', '1.21.3', '1.21.1', '1.21',
  '1.20.6', '1.20.4', '1.20.2', '1.20.1', '1.20',
  '1.19.4', '1.19.2', '1.19',
  '1.18.2', '1.18',
  '1.17.1',
  '1.16.5',
  '1.12.2',
  '1.8.9'
]

export const KNOWN_CONFLICTS: Array<{ a: string; b: string; desc: string; alt?: string }> = [
  {
    a: 'optifine',
    b: 'sodium',
    desc: 'OptiFine and Sodium are incompatible. Use Iris Shaders + Sodium for shaders instead.',
    alt: 'Replace OptiFine with Iris Shaders'
  },
  {
    a: 'optifine',
    b: 'iris',
    desc: 'OptiFine and Iris are both shader mods and cannot run together.'
  },
  {
    a: 'optifabric',
    b: 'sodium',
    desc: 'OptiFabric (OptiFine wrapper) conflicts with Sodium.'
  },
  {
    a: 'phosphor',
    b: 'starlight',
    desc: 'Phosphor and Starlight both replace the lighting engine. Use only one.'
  },
  {
    a: 'lazydfu',
    b: 'smoothboot',
    desc: 'LazyDFU and Smooth Boot have overlapping startup optimizations that conflict.'
  }
]

export const MOD_CATEGORIES = [
  'Performance',
  'World Generation',
  'Technology',
  'Magic',
  'Utility',
  'Library / API',
  'Adventure',
  'Decoration',
  'Food & Farming',
  'Transport',
  'Storage',
  'HUD & UI',
  'Optimization',
  'Shader Support',
  'Multiplayer',
  'Game Mechanics'
]

export const OPTIMIZATION_PACK: Record<LoaderType, string[]> = {
  fabric: ['sodium', 'lithium', 'ferrite-core', 'entity-culling', 'starlight', 'krypton', 'lazydfu'],
  forge: ['embeddium', 'ferritecore', 'entity-culling-forge', 'lazydfu'],
  neoforge: ['embeddium', 'ferritecore', 'entity-culling-forge'],
  quilt: ['sodium', 'lithium', 'ferrite-core', 'entity-culling'],
  vanilla: []
}
