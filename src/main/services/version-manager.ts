import axios from 'axios'
import type { MinecraftVersion, LoaderVersionInfo } from '../../shared/types'

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'

let manifestCache: {
  latest: { release: string; snapshot: string }
  versions: MinecraftVersion[]
} | null = null

export async function getVersionManifest() {
  if (manifestCache) return manifestCache
  const resp = await axios.get(MANIFEST_URL, { timeout: 10000 })
  manifestCache = resp.data
  return manifestCache!
}

export async function getReleaseVersions(): Promise<MinecraftVersion[]> {
  const manifest = await getVersionManifest()
  return manifest.versions.filter((v) => v.type === 'release')
}

export async function getAllVersions(): Promise<MinecraftVersion[]> {
  const manifest = await getVersionManifest()
  return manifest.versions
}

// ── Fabric loader versions ────────────────────────────────────────────────────
export async function getFabricLoaderVersions(mcVersion: string): Promise<LoaderVersionInfo[]> {
  const resp = await axios.get(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
    { timeout: 10000 }
  )
  return resp.data.map((v: { loader: { version: string; stable: boolean } }) => ({
    version: v.loader.version,
    stable: v.loader.stable
  }))
}

// ── Quilt loader versions ─────────────────────────────────────────────────────
export async function getQuiltLoaderVersions(_mcVersion: string): Promise<LoaderVersionInfo[]> {
  const resp = await axios.get('https://meta.quiltmc.org/v3/versions/loader', { timeout: 10000 })
  return resp.data.map((v: { version: string }) => ({ version: v.version, stable: true }))
}

// ── Forge versions ────────────────────────────────────────────────────────────
export async function getForgeVersions(mcVersion: string): Promise<LoaderVersionInfo[]> {
  try {
    const resp = await axios.get(
      'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
      { timeout: 10000 }
    )
    const promos = resp.data.promos as Record<string, string>
    const results: LoaderVersionInfo[] = []
    const rec = promos[`${mcVersion}-recommended`]
    const lat = promos[`${mcVersion}-latest`]
    if (rec) results.push({ version: rec, stable: true })
    if (lat && lat !== rec) results.push({ version: lat, stable: false })
    return results
  } catch {
    return []
  }
}

// ── NeoForge versions ─────────────────────────────────────────────────────────
export async function getNeoForgeVersions(mcVersion: string): Promise<LoaderVersionInfo[]> {
  try {
    const resp = await axios.get(
      'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml',
      { timeout: 10000 }
    )
    const xml = resp.data as string
    // NeoForge versions are like "21.1.x" for MC "1.21.1"
    const mcMajorMinor = mcVersion.split('.').slice(1).join('.')
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
      .map((m) => m[1])
      .filter((v) => v.startsWith(mcMajorMinor))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .slice(0, 15)
    return versions.map((v, i) => ({ version: v, stable: i === 0 }))
  } catch {
    return []
  }
}

export async function getLoaderVersions(
  loader: string,
  mcVersion: string
): Promise<LoaderVersionInfo[]> {
  switch (loader) {
    case 'fabric':
      return getFabricLoaderVersions(mcVersion)
    case 'quilt':
      return getQuiltLoaderVersions(mcVersion)
    case 'forge':
      return getForgeVersions(mcVersion)
    case 'neoforge':
      return getNeoForgeVersions(mcVersion)
    default:
      return []
  }
}
