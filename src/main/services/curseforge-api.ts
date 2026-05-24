import axios from 'axios'
import type { SearchParams, SearchResult, ModSearchHit, ModVersion } from '../../shared/types'

const BASE_URL = 'https://api.curseforge.com/v1'
const MINECRAFT_GAME_ID = 432
const MODS_CLASS_ID = 6

function makeClient(apiKey: string) {
  return axios.create({
    baseURL: BASE_URL,
    headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
    timeout: 15000
  })
}

const CF_CATEGORIES: Record<string, number> = {
  Performance: 435,
  'World Generation': 406,
  Technology: 412,
  Magic: 407,
  Utility: 5191,
  'Library / API': 421,
  Adventure: 422,
  Decoration: 424
}

export async function searchCurseForge(
  params: SearchParams,
  apiKey: string
): Promise<SearchResult> {
  if (!apiKey) {
    return { hits: [], total: 0, offset: 0, limit: 20 }
  }

  const client = makeClient(apiKey)
  const query: Record<string, unknown> = {
    gameId: MINECRAFT_GAME_ID,
    classId: MODS_CLASS_ID,
    searchFilter: params.query || '',
    pageSize: params.limit ?? 20,
    index: params.offset ?? 0,
    sortField: 2
  }

  if (params.mcVersion) query.gameVersion = params.mcVersion
  if (params.loader) {
    const loaderIds: Record<string, number> = {
      forge: 1, fabric: 4, quilt: 5, neoforge: 6
    }
    if (loaderIds[params.loader]) query.modLoaderType = loaderIds[params.loader]
  }
  if (params.category && CF_CATEGORIES[params.category]) {
    query.categoryId = CF_CATEGORIES[params.category]
  }

  const resp = await client.get('/mods/search', { params: query })
  const data = resp.data

  const hits: ModSearchHit[] = (data.data ?? []).map((m: Record<string, unknown>) => {
    const links = m.links as Record<string, string>
    const logo = m.logo as Record<string, string> | null
    const authors = m.authors as Array<Record<string, string>>
    const latestFiles = m.latestFilesIndexes as Array<Record<string, unknown>>
    const gameVersionLatestFiles = m.gameVersionLatestFiles as Array<Record<string, unknown>> ?? []

    return {
      id: String(m.id),
      slug: m.slug as string,
      title: m.name as string,
      description: m.summary as string,
      author: authors?.[0]?.name ?? 'Unknown',
      iconUrl: logo?.thumbnailUrl ?? logo?.url,
      downloads: m.downloadCount as number,
      categories: ((m.categories as Array<Record<string, string>>) ?? []).map((c) => c.name),
      loaders: latestFiles?.map((f) => String(f.modLoader)).filter(Boolean) ?? [],
      versions: gameVersionLatestFiles.map((f) => f.gameVersion as string),
      updatedAt: m.dateModified as string,
      source: 'curseforge' as const
    }
  })

  return {
    hits,
    total: data.pagination?.totalCount ?? 0,
    offset: data.pagination?.index ?? 0,
    limit: data.pagination?.pageSize ?? 20
  }
}

export async function getCurseForgeVersions(
  modId: string,
  apiKey: string,
  loader?: string,
  mcVersion?: string
): Promise<ModVersion[]> {
  if (!apiKey) return []
  const client = makeClient(apiKey)

  const params: Record<string, unknown> = {}
  if (mcVersion) params.gameVersion = mcVersion
  if (loader) {
    const loaderIds: Record<string, number> = {
      forge: 1, fabric: 4, quilt: 5, neoforge: 6
    }
    if (loaderIds[loader]) params.modLoaderType = loaderIds[loader]
  }

  const resp = await client.get(`/mods/${modId}/files`, { params })

  return (resp.data.data ?? []).map((f: Record<string, unknown>) => ({
    id: String(f.id),
    name: f.displayName as string,
    versionNumber: f.fileName as string,
    gameVersions: (f.gameVersions as string[]) ?? [],
    loaders: [],
    files: [
      {
        url: (f.downloadUrl as string) ?? '',
        filename: f.fileName as string,
        primary: true,
        size: (f.fileLength as number) ?? 0
      }
    ],
    dependencies: ((f.dependencies as Array<Record<string, unknown>>) ?? [])
      .filter((d) => d.relationType === 3)
      .map((d) => ({
        id: String(d.modId),
        required: true
      })),
    releaseType:
      f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha',
    datePublished: f.fileDate as string,
    downloads: f.downloadCount as number
  }))
}
