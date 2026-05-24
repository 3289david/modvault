import AdmZip from 'adm-zip'
import * as fs from 'fs'
import type { InstalledMod, LoaderType, ModDependency } from '../../shared/types'

interface FabricModJson {
  id: string
  version: string
  name?: string
  description?: string
  authors?: Array<string | { name: string }>
  depends?: Record<string, string>
  breaks?: Record<string, string>
  icon?: string
  environment?: string
}

interface QuiltModJson {
  quilt_loader: {
    id: string
    version: string
    metadata?: {
      name?: string
      description?: string
      contributors?: Record<string, string>
      icon?: string
    }
    depends?: Array<{ id: string; versions?: string; optional?: boolean }>
    breaks?: Array<{ id: string }>
  }
}

function parseTomlBasic(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentSection = result
  let sectionName = ''

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sectionMatch = trimmed.match(/^\[\[?([^\]]+)\]?\]?$/)
    if (sectionMatch) {
      sectionName = sectionMatch[1].trim()
      if (!result[sectionName]) result[sectionName] = []
      const arr = result[sectionName] as Record<string, unknown>[]
      const newSection: Record<string, unknown> = {}
      arr.push(newSection)
      currentSection = newSection
      continue
    }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
    if (kvMatch) {
      const key = kvMatch[1]
      let value: string = kvMatch[2].trim()
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      } else if (value.startsWith('"""')) {
        value = value.replace(/"""/g, '').trim()
      }
      if (sectionName) {
        currentSection[key] = value
      } else {
        result[key] = value
      }
    }
  }
  return result
}

function parseFabric(data: FabricModJson, fileName: string): Partial<InstalledMod> {
  const deps: ModDependency[] = []
  if (data.depends) {
    for (const [id, version] of Object.entries(data.depends)) {
      if (id === 'java' || id === 'fabricloader') continue
      deps.push({ id, required: true, versionRange: version as string })
    }
  }

  const authors = (data.authors ?? []).map((a) =>
    typeof a === 'string' ? a : a.name
  )

  return {
    id: data.id,
    name: data.name ?? data.id,
    version: data.version,
    description: data.description ?? '',
    loaders: ['fabric'],
    authors,
    dependencies: deps,
    categories: []
  }
}

function parseQuilt(data: QuiltModJson, fileName: string): Partial<InstalledMod> {
  const ql = data.quilt_loader
  const deps: ModDependency[] = (ql.depends ?? [])
    .filter((d) => d.id !== 'quilt_loader' && d.id !== 'java')
    .map((d) => ({
      id: d.id,
      required: !d.optional,
      versionRange: d.versions
    }))

  const authors = ql.metadata?.contributors
    ? Object.keys(ql.metadata.contributors)
    : []

  return {
    id: ql.id,
    name: ql.metadata?.name ?? ql.id,
    version: ql.version,
    description: ql.metadata?.description ?? '',
    loaders: ['quilt'],
    authors,
    dependencies: deps,
    categories: []
  }
}

function parseForgeToml(content: string): Partial<InstalledMod> {
  const data = parseTomlBasic(content)
  const modsArr = (data['mods'] as Record<string, unknown>[]) ?? []
  const firstMod = modsArr[0] ?? {}

  const modId = (firstMod['modId'] as string) ?? 'unknown'
  const depsArr = (data[`dependencies.${modId}`] as Record<string, unknown>[]) ?? []

  const deps: ModDependency[] = depsArr
    .filter((d) => d['modId'] !== 'forge' && d['modId'] !== 'neoforge' && d['modId'] !== 'minecraft')
    .map((d) => ({
      id: d['modId'] as string,
      required: d['mandatory'] !== 'false',
      versionRange: d['versionRange'] as string | undefined
    }))

  const loader = (data['modLoader'] as string)?.includes('neoforge') ? 'neoforge' : 'forge'

  return {
    id: modId,
    name: (firstMod['displayName'] as string) ?? modId,
    version: (firstMod['version'] as string) ?? '0.0.0',
    description: (firstMod['description'] as string) ?? '',
    loaders: [loader as LoaderType],
    authors: firstMod['authors'] ? [(firstMod['authors'] as string)] : [],
    dependencies: deps,
    categories: []
  }
}

export function analyzeJar(jarPath: string, fileName: string): Partial<InstalledMod> | null {
  try {
    const zip = new AdmZip(jarPath)

    const fabricEntry = zip.getEntry('fabric.mod.json')
    if (fabricEntry) {
      const data = JSON.parse(fabricEntry.getData().toString('utf8')) as FabricModJson
      return parseFabric(data, fileName)
    }

    const quiltEntry = zip.getEntry('quilt.mod.json')
    if (quiltEntry) {
      const data = JSON.parse(quiltEntry.getData().toString('utf8')) as QuiltModJson
      return parseQuilt(data, fileName)
    }

    const modsTomlEntry = zip.getEntry('META-INF/mods.toml')
    if (modsTomlEntry) {
      return parseForgeToml(modsTomlEntry.getData().toString('utf8'))
    }

    const mcmodEntry = zip.getEntry('mcmod.info')
    if (mcmodEntry) {
      const arr = JSON.parse(mcmodEntry.getData().toString('utf8'))
      const mod = Array.isArray(arr) ? arr[0] : arr
      return {
        id: mod.modid ?? 'unknown',
        name: mod.name ?? mod.modid ?? 'Unknown',
        version: mod.version ?? '0.0.0',
        description: mod.description ?? '',
        loaders: ['forge'],
        authors: mod.authorList ?? mod.authors ?? [],
        dependencies: [],
        categories: []
      }
    }

    return {
      id: fileName.replace(/\.jar$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: fileName.replace(/\.jar$/, ''),
      version: '0.0.0',
      description: 'Unknown mod — no metadata found in JAR.',
      loaders: [],
      authors: [],
      dependencies: [],
      categories: []
    }
  } catch {
    return null
  }
}

export function scanModsFolder(modsFolder: string): Map<string, Partial<InstalledMod>> {
  const result = new Map<string, Partial<InstalledMod>>()
  if (!fs.existsSync(modsFolder)) return result

  const files = fs.readdirSync(modsFolder).filter((f) => f.endsWith('.jar'))
  for (const file of files) {
    const fullPath = `${modsFolder}/${file}`
    const meta = analyzeJar(fullPath, file)
    if (meta) result.set(file, meta)
  }
  return result
}
