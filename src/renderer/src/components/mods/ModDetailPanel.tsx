import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  XIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LoaderSpinIcon,
  ChevronDownIcon,
  CheckIcon,
  PackageIcon,
  StarIcon,
  RefreshIcon,
  GitBranchIcon,
  AlertTriangleIcon
} from '../../icons'
import { useStore, selectActiveInstance } from '../../store'
import { DepsPrompt } from './DepsPrompt'
import type { ModSearchHit, ModVersion, LoaderType, DepInfo } from '@shared/types'

function VersionRow({
  version,
  onInstall,
  installing
}: {
  version: ModVersion
  onInstall: (v: ModVersion) => void
  installing: boolean
}) {
  const typeColors: Record<string, string> = {
    release: 'badge-emerald',
    beta: 'badge-amber',
    alpha: 'badge-red'
  }
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-zinc-200">{version.versionNumber}</span>
          <span className={typeColors[version.releaseType]}>{version.releaseType}</span>
        </div>
        <div className="text-[10px] text-zinc-600 mt-0.5 flex gap-2 flex-wrap">
          <span>{version.gameVersions.slice(0, 3).join(', ')}</span>
          {version.loaders.length > 0 && (
            <span>· {version.loaders.join(', ')}</span>
          )}
          <span>· {version.downloads.toLocaleString()} downloads</span>
        </div>
      </div>
      <button
        onClick={() => onInstall(version)}
        disabled={installing}
        className="btn-primary py-1 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        {installing ? <LoaderSpinIcon size={12} /> : <DownloadIcon size={12} />}
        Install
      </button>
    </div>
  )
}

interface Props {
  mod: ModSearchHit | null
  onClose: () => void
}

export function ModDetailPanel({ mod, onClose }: Props) {
  const [versions, setVersions] = useState<ModVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [installingVersionId, setInstallingVersionId] = useState<string | null>(null)
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [missingDeps, setMissingDeps] = useState<DepInfo[]>([])
  const [showDeps, setShowDeps] = useState(false)
  const [similar, setSimilar] = useState<ModSearchHit[]>([])

  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore((s) =>
    activeInstance ? (s.installedMods[activeInstance.id] ?? []) : []
  )
  const addInstalledMod = useStore((s) => s.addInstalledMod)

  // Loader incompatibility warning
  const loaderIncompat =
    activeInstance &&
    mod &&
    mod.loaders.length > 0 &&
    !mod.loaders.includes(activeInstance.loader)

  // Already installed check
  const isInstalled = mod
    ? installedMods.some((m) => m.projectId === mod.id)
    : false

  useEffect(() => {
    if (!mod) return
    setVersions([])
    setShowAllVersions(false)
    setSimilar([])
    setLoadingVersions(true)

    const loader = activeInstance?.loader
    const mcVersion = activeInstance?.minecraftVersion

    const fetch =
      mod.source === 'modrinth'
        ? window.api.getModrinthVersions(mod.id, loader, mcVersion)
        : window.api.getCurseForgeVersions(mod.id, loader, mcVersion)

    fetch
      .then((v) => setVersions(v))
      .catch(() => setVersions([]))
      .finally(() => setLoadingVersions(false))

    // Fetch similar mods using first category — only for Modrinth
    if (mod.source === 'modrinth' && mod.categories.length > 0) {
      const installedIds = new Set(installedMods.map((m) => m.projectId).filter(Boolean))
      window.api
        .searchModrinth({
          query: '',
          loader: loader,
          mcVersion: mcVersion,
          category: mod.categories[0],
          limit: 8
        })
        .then((r) => {
          const hits = r.hits.filter(
            (h) => h.id !== mod.id && !installedIds.has(h.id)
          ).slice(0, 3)
          setSimilar(hits)
        })
        .catch(() => setSimilar([]))
    }
  }, [mod?.id, activeInstance?.loader, activeInstance?.minecraftVersion])

  if (!mod) return null

  const checkDepsAfterInstall = async (instanceId: string, sourceId?: string) => {
    if (!sourceId || mod?.source !== 'modrinth') return
    try {
      const deps = await window.api.checkModDeps(instanceId, sourceId)
      if (deps.length > 0) {
        setMissingDeps(deps)
        setShowDeps(true)
      }
    } catch { /* not critical */ }
  }

  const handleInstallVersion = async (version: ModVersion) => {
    if (!activeInstance) { toast.error('Select an instance first'); return }
    setInstallingVersionId(version.id)
    try {
      const file = version.files.find((f) => f.primary) ?? version.files[0]
      const installed = await window.api.installMod({
        instanceId: activeInstance.id,
        modId: mod.id,
        versionId: version.id,
        source: mod.source,
        fileName: file?.filename,
        downloadUrl: file?.url
      })
      addInstalledMod(activeInstance.id, installed)
      toast.success(`Installed ${mod.title} ${version.versionNumber}`)
      await checkDepsAfterInstall(activeInstance.id, installed.sourceId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setInstallingVersionId(null)
    }
  }

  const handleInstallLatest = async () => {
    const latestRelease = versions.find((v) => v.releaseType === 'release') ?? versions[0]
    if (latestRelease) { handleInstallVersion(latestRelease); return }
    if (!activeInstance) { toast.error('Select an instance first'); return }
    try {
      const installed = await window.api.installMod({
        instanceId: activeInstance.id,
        modId: mod.id,
        versionId: 'auto',
        source: mod.source
      })
      addInstalledMod(activeInstance.id, installed)
      toast.success(`Installed ${mod.title}`)
      await checkDepsAfterInstall(activeInstance.id, installed.sourceId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Install failed')
    }
  }

  const openPage = () => {
    const url =
      mod.source === 'modrinth'
        ? `https://modrinth.com/mod/${mod.slug}`
        : `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`
    window.api.openExternal(url)
  }

  const displayedVersions = showAllVersions ? versions : versions.slice(0, 8)

  return (
    <>
    {showDeps && (
      <DepsPrompt
        deps={missingDeps}
        onClose={() => { setShowDeps(false); setMissingDeps([]) }}
      />
    )}
    <div className="w-80 shrink-0 border-l border-zinc-800/60 bg-zinc-950 flex flex-col overflow-hidden animate-slide-in-right">
      {/* Loader incompatibility warning */}
      {loaderIncompat && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangleIcon size={13} className="text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-300 leading-snug">
            This mod doesn't officially support <strong>{activeInstance.loader}</strong>. Install may not work.
          </p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-zinc-800/60">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-cover" />
          ) : (
            <PackageIcon size={20} className="text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100 leading-tight">{mod.title}</h2>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{mod.author}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5 shrink-0">
          <XIcon size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <div className="text-sm font-semibold text-zinc-200">
              {mod.downloads >= 1_000_000
                ? `${(mod.downloads / 1_000_000).toFixed(1)}M`
                : mod.downloads >= 1_000
                ? `${(mod.downloads / 1_000).toFixed(0)}K`
                : mod.downloads}
            </div>
            <div className="text-[10px] text-zinc-600 mt-0.5">Downloads</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <div className="text-sm font-semibold text-zinc-200 capitalize">{mod.source}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">Source</div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-4">
          <p className="text-xs text-zinc-400 leading-relaxed">{mod.description}</p>
        </div>

        {/* Loaders & versions */}
        <div className="px-4 pb-4 space-y-2">
          {mod.loaders.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-1.5">Supports</div>
              <div className="flex flex-wrap gap-1">
                {mod.loaders.map((l) => (
                  <span key={l} className={`loader-badge-${l} text-[10px]`}>{l}</span>
                ))}
              </div>
            </div>
          )}
          {mod.versions.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-1.5">MC Versions</div>
              <div className="flex flex-wrap gap-1">
                {mod.versions.slice(0, 6).map((v) => (
                  <span key={v} className="badge-zinc text-[10px]">{v}</span>
                ))}
                {mod.versions.length > 6 && (
                  <span className="badge-zinc text-[10px]">+{mod.versions.length - 6}</span>
                )}
              </div>
            </div>
          )}
          {mod.categories.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-1.5">Categories</div>
              <div className="flex flex-wrap gap-1">
                {mod.categories.slice(0, 4).map((c) => (
                  <span key={c} className="badge-zinc text-[10px]">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Versions list */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Versions
              {versions.length > 0 && (
                <span className="ml-1 text-zinc-600">({versions.length})</span>
              )}
            </div>
            {activeInstance && (
              <span className="text-[10px] text-zinc-600">
                for {activeInstance.minecraftVersion} · {activeInstance.loader}
              </span>
            )}
          </div>

          {loadingVersions ? (
            <div className="flex items-center gap-2 py-4 text-zinc-600 text-xs">
              <LoaderSpinIcon size={12} />
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-xs text-zinc-600 py-2">
              No compatible versions found for this instance.
            </div>
          ) : (
            <div className="card divide-y-0">
              {displayedVersions.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  onInstall={handleInstallVersion}
                  installing={installingVersionId === v.id}
                />
              ))}
              {!showAllVersions && versions.length > 8 && (
                <button
                  onClick={() => setShowAllVersions(true)}
                  className="w-full text-center py-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Show {versions.length - 8} more versions
                </button>
              )}
            </div>
          )}
        </div>

        {/* Similar mods */}
        {similar.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              You Might Also Like
            </div>
            <div className="space-y-1.5">
              {similar.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    // Trigger detail view for this mod — bubble up via a custom event
                    window.dispatchEvent(new CustomEvent('browse:select-mod', { detail: s }))
                  }}
                  className="w-full flex items-center gap-2.5 bg-zinc-900/60 hover:bg-zinc-800/60 rounded-xl px-3 py-2 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.iconUrl ? (
                      <img src={s.iconUrl} alt={s.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <PackageIcon size={12} className="text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{s.title}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{s.author}</p>
                  </div>
                  <DownloadIcon size={11} className="text-zinc-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-zinc-800/60 space-y-2">
        {isInstalled ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <CheckIcon size={13} />
            Already installed
          </div>
        ) : (
          <button onClick={handleInstallLatest} className="btn-primary w-full justify-center">
            <DownloadIcon size={14} />
            Install Latest
          </button>
        )}
        <button onClick={openPage} className="btn-ghost w-full justify-center text-xs">
          <ExternalLinkIcon size={12} />
          View on {mod.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}
        </button>
      </div>
    </div>
    </>
  )
}
