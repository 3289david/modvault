import React, { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PackageIcon,
  TrashIcon,
  SearchIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  InfoIcon,
  CheckIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  RefreshIcon,
  UploadIcon,
  LoaderSpinIcon,
  ExternalLinkIcon,
  FilterIcon,
  FolderIcon
} from '../icons'
import { useStore, selectActiveInstance, selectInstalledMods, selectConflicts } from '../store'
import { useInstalledMods, useConflicts } from '../hooks/useElectron'
import type { InstalledMod, Conflict } from '@shared/types'

function ConflictBadge({ conflicts, modId }: { conflicts: Conflict[]; modId: string }) {
  const relevant = conflicts.filter((c) => c.mod1Id === modId || c.mod2Id === modId)
  if (!relevant.length) return null
  const hasError = relevant.some((c) => c.severity === 'error')
  return (
    <span
      className={`badge text-[10px] ${hasError ? 'badge-red' : 'badge-amber'}`}
      title={relevant[0].description}
    >
      {hasError ? <AlertCircleIcon size={9} /> : <AlertTriangleIcon size={9} />}
      {hasError ? 'Conflict' : 'Warning'}
    </span>
  )
}

function ModRow({
  mod,
  conflicts,
  onToggle,
  onDelete,
  toggling,
  deleting
}: {
  mod: InstalledMod
  conflicts: Conflict[]
  onToggle: () => void
  onDelete: () => void
  toggling: boolean
  deleting: boolean
}) {
  const openPage = () => {
    if (!mod.projectId) return
    const url =
      mod.source === 'modrinth'
        ? `https://modrinth.com/mod/${mod.projectId}`
        : `https://www.curseforge.com/minecraft/mc-mods/${mod.projectId}`
    window.api.openExternal(url)
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 group hover:bg-zinc-800/30 transition-colors ${
        !mod.enabled ? 'opacity-50' : ''
      }`}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        {mod.iconUrl ? (
          <img src={mod.iconUrl} alt={mod.name} className="w-full h-full rounded-lg object-cover" />
        ) : (
          <PackageIcon size={14} className="text-zinc-600" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-200 truncate">{mod.name}</span>
          <ConflictBadge conflicts={conflicts} modId={mod.id} />
          {mod.source === 'manual' && <span className="badge-zinc text-[10px]">Manual</span>}
        </div>
        <div className="text-xs text-zinc-600 mt-0.5 truncate">
          v{mod.version}
          {mod.authors.length > 0 && ` · ${mod.authors.slice(0, 2).join(', ')}`}
          {mod.fileSize && ` · ${(mod.fileSize / 1024 / 1024).toFixed(1)} MB`}
        </div>
      </div>

      {/* Loader badges */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {mod.loaders.slice(0, 2).map((l) => (
          <span key={l} className={`loader-badge-${l} text-[10px]`}>{l}</span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 no-drag">
        {mod.source !== 'manual' && mod.projectId && (
          <button onClick={openPage} className="btn-ghost py-1 px-2" title="View mod page">
            <ExternalLinkIcon size={12} />
          </button>
        )}
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`btn-ghost py-1 px-2 ${mod.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600'}`}
          title={mod.enabled ? 'Disable' : 'Enable'}
        >
          {toggling ? <LoaderSpinIcon size={14} /> : mod.enabled ? <ToggleRightIcon size={14} /> : <ToggleLeftIcon size={14} />}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="btn-ghost py-1 px-2 text-zinc-600 hover:text-red-400 transition-colors"
          title="Uninstall"
        >
          {deleting ? <LoaderSpinIcon size={14} /> : <TrashIcon size={14} />}
        </button>
      </div>
    </div>
  )
}

export function Library() {
  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore(selectInstalledMods)
  const conflicts = useStore(selectConflicts)
  const updateMod = useStore((s) => s.updateInstalledMod)
  const removeMod = useStore((s) => s.removeInstalledMod)
  const { reload } = useInstalledMods(activeInstance?.id ?? null)
  const { check: checkConflicts } = useConflicts(activeInstance?.id ?? null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'conflicting'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const conflictModIds = new Set(conflicts.flatMap((c) => [c.mod1Id, c.mod2Id]))

  const filtered = useMemo(() => {
    let mods = installedMods
    if (search) {
      const q = search.toLowerCase()
      mods = mods.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      )
    }
    if (filter === 'enabled') mods = mods.filter((m) => m.enabled)
    if (filter === 'disabled') mods = mods.filter((m) => !m.enabled)
    if (filter === 'conflicting') mods = mods.filter((m) => conflictModIds.has(m.id))
    return mods
  }, [installedMods, search, filter, conflictModIds])

  const handleToggle = async (mod: InstalledMod) => {
    setTogglingId(mod.fileId)
    try {
      await window.api.toggleMod(activeInstance!.id, mod.fileId, !mod.enabled)
      updateMod(activeInstance!.id, mod.fileId, { enabled: !mod.enabled })
      await checkConflicts()
    } catch {
      toast.error('Failed to toggle mod')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (mod: InstalledMod) => {
    setDeletingId(mod.fileId)
    try {
      await window.api.uninstallMod(activeInstance!.id, mod.fileId)
      removeMod(activeInstance!.id, mod.fileId)
      await checkConflicts()
      toast.success(`Removed ${mod.name}`)
    } catch {
      toast.error('Failed to remove mod')
    } finally {
      setDeletingId(null)
    }
  }

  const handleImport = async () => {
    if (!activeInstance) { toast.error('Select an instance first'); return }
    setImporting(true)
    try {
      const mod = await window.api.importLocalMod(activeInstance.id)
      if (mod) {
        useStore.getState().addInstalledMod(activeInstance.id, mod)
        toast.success(`Imported ${mod.name}`)
        await checkConflicts()
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!activeInstance) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <PackageIcon size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Select an instance from the sidebar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-zinc-800/60 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              className="input pl-9 py-1.5 text-sm"
              placeholder="Search mods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1">
            {(['all', 'enabled', 'disabled', 'conflicting'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'conflicting' && conflicts.length > 0 && (
                  <span className="ml-1 badge-red text-[10px] py-0">{conflicts.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <button onClick={() => { reload(); checkConflicts() }} className="btn-ghost py-1.5 px-3 text-xs">
              <RefreshIcon size={13} />
              Refresh
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              {importing ? <LoaderSpinIcon size={13} /> : <UploadIcon size={13} />}
              Import JAR
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts panel */}
      {conflicts.length > 0 && filter !== 'conflicting' && (
        <div className="shrink-0 px-4 pt-3">
          <div className="conflict-error">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-300 mb-1.5">
                  {conflicts.filter((c) => c.severity === 'error').length} conflict(s) detected
                </p>
                <div className="space-y-1.5">
                  {conflicts.slice(0, 3).map((c, i) => (
                    <div key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className={`shrink-0 mt-0.5 ${c.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                        {c.severity === 'error' ? '✕' : '⚠'}
                      </span>
                      <span>{c.description}</span>
                    </div>
                  ))}
                  {conflicts.length > 3 && (
                    <button onClick={() => setFilter('conflicting')} className="text-xs text-violet-400 hover:underline">
                      +{conflicts.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mod list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PackageIcon size={36} className="text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                {installedMods.length === 0
                  ? 'No mods installed — browse and install from the Browse tab'
                  : 'No mods match your filter'}
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-zinc-800/60">
              <div className="px-4 py-2 flex items-center justify-between bg-zinc-900/40 rounded-t-xl">
                <span className="text-xs text-zinc-500">
                  {filtered.length} mod{filtered.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-zinc-600">
                  {installedMods.filter((m) => m.enabled).length} enabled
                </span>
              </div>
              {filtered.map((mod) => (
                <ModRow
                  key={mod.fileId}
                  mod={mod}
                  conflicts={conflicts}
                  onToggle={() => handleToggle(mod)}
                  onDelete={() => handleDelete(mod)}
                  toggling={togglingId === mod.fileId}
                  deleting={deletingId === mod.fileId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
