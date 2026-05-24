import axios from 'axios'
import type { SearchParams, SearchResult, ModSearchHit, ModVersion } from '../../shared/types'

const BASE_URL = 'https://api.modrinth.com/v2'
const HEADERS = {
  'User-Agent': 'ModVault/1.0.0 (github.com/danwoo/modvault)',
  'Accept': 'application/json'
}

const http = axios.create({ baseURL: BASE_URL, headers: HEADERS, timeout: 15000 })

const CATEGORY_FACETS: Record<string, string> = {
  Performance: 'performance',
  'World Generation': 'worldgen',
  Technology: 'technology',
  Magic: 'magic',
  Utility: 'utility',
  'Library / API': 'library',
  Adventure: 'adventure',
  Decoration: 'decoration',
  Optimization: 'optimization',
  'HUD & UI': 'gui',
  Storage: 'storage',
  Food: 'food',
  Transport: 'transportation',
  Magic2: 'magic'
}

export async function searchModrinth(params: SearchParams): Promise<SearchResult> {
  const facets: string[][] = [['project_type:mod']]

  if (params.loader) facets.push([`categories:${params.loader}`])
  if (params.mcVersion) facets.push([`versions:${params.mcVersion}`])
  if (params.category && CATEGORY_FACETS[params.category]) {
    facets.push([`categories:${CATEGORY_FACETS[params.category]}`])
  }

  const resp = await http.get('/search', {
    params: {
      query: params.query || '',
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      facets: JSON.stringify(facets),
      index: 'relevance'
    }
  })

  const hits: ModSearchHit[] = resp.data.hits.map((h: Record<string, unknown>) => ({
    id: h.project_id as string,
    slug: h.slug as string,
    title: h.title as string,
    description: h.description as string,
    author: h.author as string,
    iconUrl: h.icon_url as string | undefined,
    downloads: h.downloads as number,
    followers: h.follows as number,
    categories: h.categories as string[],
    loaders: (h.loaders as string[]) ?? [],
    versions: h.versions as string[],
    latestVersion: (h.versions as string[])[0],
    updatedAt: h.date_modified as string,
    source: 'modrinth' as const
  }))

  return { hits, total: resp.data.total_hits, offset: resp.data.offset, limit: resp.data.limit }
}

export async function getModrinthVersions(
  projectId: string,
  loader?: string,
  mcVersion?: string
): Promise<ModVersion[]> {
  try {
    const params: Record<string, string> = {}
    if (loader) params.loaders = JSON.stringify([loader])
    if (mcVersion) params.game_versions = JSON.stringify([mcVersion])

    const resp = await http.get(`/project/${projectId}/version`, { params })

    return resp.data.map((v: Record<string, unknown>) => ({
      id: v.id as string,
      name: v.name as string,
      versionNumber: v.version_number as string,
      gameVersions: v.game_versions as string[],
      loaders: v.loaders as string[],
      files: ((v.files as unknown[]) ?? []).map((f: unknown) => {
        const file = f as Record<string, unknown>
        return {
          url: file.url as string,
          filename: file.filename as string,
          primary: file.primary as boolean,
          size: file.size as number
        }
      }),
      dependencies: ((v.dependencies as unknown[]) ?? []).map((d: unknown) => {
        const dep = d as Record<string, unknown>
        return {
          id: (dep.project_id ?? dep.version_id) as string,
          required: dep.dependency_type === 'required'
        }
      }),
      releaseType: v.version_type as 'release' | 'beta' | 'alpha',
      datePublished: v.date_published as string,
      downloads: v.downloads as number
    }))
  } catch (err: unknown) {
    // 404 = project / slug not found; 400 = invalid filter params
    // Either way return empty — callers treat [] as "no compatible version"
    if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 400)) {
      return []
    }
    throw err
  }
}

export async function getModrinthProject(idOrSlug: string): Promise<Record<string, unknown>> {
  const resp = await http.get(`/project/${idOrSlug}`)
  return resp.data
}

export async function getBestVersion(
  projectId: string,
  loader: string,
  mcVersion: string
): Promise<ModVersion | null> {
  try {
    // Pass 1: exact loader + MC version filter
    const versions = await getModrinthVersions(projectId, loader, mcVersion)
    if (versions.length) {
      return versions.find((v) => v.releaseType === 'release') ?? versions[0]
    }

    // Pass 2: widen search — all versions for this project, filter manually
    const all = await getModrinthVersions(projectId)
    if (!all.length) return null

    const mcMajor = mcVersion.slice(0, 4) // e.g. "1.20"
    const compatible = all.filter(
      (v) =>
        (v.loaders.length === 0 || v.loaders.includes(loader)) &&
        (v.gameVersions.includes(mcVersion) ||
          v.gameVersions.some((gv) => gv.startsWith(mcMajor)))
    )
    return compatible.find((v) => v.releaseType === 'release') ?? compatible[0] ?? null
  } catch {
    return null
  }
}
