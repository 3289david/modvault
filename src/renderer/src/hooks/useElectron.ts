import { useEffect, useCallback } from 'react'
import type { ElectronAPI } from '../../../preload/index'
import type { DownloadProgress } from '@shared/types'
import { useStore } from '../store'

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export function useApi() {
  return window.api
}

export function useDownloadListener() {
  const setDownloadProgress = useStore((s) => s.setDownloadProgress)
  const removeDownload = useStore((s) => s.removeDownload)

  useEffect(() => {
    const unsubscribe = window.api.onDownloadProgress((p: DownloadProgress) => {
      setDownloadProgress(p)
      if (p.status === 'done' || p.status === 'error') {
        setTimeout(() => removeDownload(p.modId), 2000)
      }
    })
    return unsubscribe
  }, [setDownloadProgress, removeDownload])
}

export function useInstanceLoader() {
  const setInstances = useStore((s) => s.setInstances)
  const setActiveInstance = useStore((s) => s.setActiveInstance)
  const activeInstanceId = useStore((s) => s.activeInstanceId)
  const instancesLoaded = useStore((s) => s.instancesLoaded)

  const load = useCallback(async () => {
    const instances = await window.api.getAllInstances()
    setInstances(instances)
    if (instances.length > 0 && !activeInstanceId) {
      setActiveInstance(instances[0].id)
    }
  }, [setInstances, setActiveInstance, activeInstanceId])

  useEffect(() => {
    if (!instancesLoaded) load()
  }, [instancesLoaded, load])

  return { load }
}

export function useSettingsLoader() {
  const setSettings = useStore((s) => s.setSettings)
  const settingsLoaded = useStore((s) => s.settingsLoaded)

  useEffect(() => {
    if (!settingsLoaded) {
      window.api.getSettings().then(setSettings)
    }
  }, [settingsLoaded, setSettings])
}

export function useInstalledMods(instanceId: string | null) {
  const setInstalledMods = useStore((s) => s.setInstalledMods)
  const installedMods = useStore((s) =>
    instanceId ? (s.installedMods[instanceId] ?? null) : null
  )

  const load = useCallback(async () => {
    if (!instanceId) return
    const mods = await window.api.getInstalledMods(instanceId)
    setInstalledMods(instanceId, mods)
  }, [instanceId, setInstalledMods])

  useEffect(() => {
    if (instanceId && installedMods === null) load()
  }, [instanceId, installedMods, load])

  return { mods: installedMods ?? [], reload: load }
}

export function useConflicts(instanceId: string | null) {
  const setConflicts = useStore((s) => s.setConflicts)
  const autoCheck = useStore((s) => s.settings?.autoCheckConflicts ?? true)

  const check = useCallback(async () => {
    if (!instanceId) return []
    const conflicts = await window.api.detectConflicts(instanceId)
    setConflicts(instanceId, conflicts)
    return conflicts
  }, [instanceId, setConflicts])

  useEffect(() => {
    if (instanceId && autoCheck) check()
  }, [instanceId, autoCheck, check])

  return { check }
}
