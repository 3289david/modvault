import axios from 'axios'
import { store } from '../store'

const http = axios.create({
  baseURL: 'https://api.modrinth.com/v2',
  headers: { 'User-Agent': 'ModVault/1.0.0', Accept: 'application/json' },
  timeout: 10000
})

export interface DepInfo {
  projectId: string
  name: string
  slug: string
  iconUrl?: string
  required: boolean
}

/**
 * Given a Modrinth version ID and an instance, returns a list of
 * dependencies that are declared by that version but NOT yet installed.
 */
export async function getMissingDeps(
  instanceId: string,
  versionId: string
): Promise<DepInfo[]> {
  try {
    const verResp = await http.get(`/version/${versionId}`)
    const rawDeps: Array<{ project_id?: string; dependency_type: string }> =
      verResp.data.dependencies ?? []

    // Only required / optional host deps that reference a project_id
    const relevant = rawDeps.filter(
      (d) =>
        d.project_id &&
        (d.dependency_type === 'required' || d.dependency_type === 'optional')
    )
    if (!relevant.length) return []

    const installed = store.getInstalledMods(instanceId)
    const installedProjIds = new Set(
      installed.map((m) => m.projectId).filter(Boolean) as string[]
    )

    const missing = relevant.filter((d) => !installedProjIds.has(d.project_id!))
    if (!missing.length) return []

    const results: DepInfo[] = []
    await Promise.allSettled(
      missing.map(async (dep) => {
        try {
          const projResp = await http.get(`/project/${dep.project_id}`)
          results.push({
            projectId: dep.project_id!,
            name: projResp.data.title ?? dep.project_id!,
            slug: projResp.data.slug ?? dep.project_id!,
            iconUrl: projResp.data.icon_url ?? undefined,
            required: dep.dependency_type === 'required'
          })
        } catch {
          // If project info fetch fails, still surface the dep
          results.push({
            projectId: dep.project_id!,
            name: dep.project_id!,
            slug: dep.project_id!,
            required: dep.dependency_type === 'required'
          })
        }
      })
    )

    return results
  } catch {
    return []
  }
}
