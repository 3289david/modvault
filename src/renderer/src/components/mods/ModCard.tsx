import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  DownloadIcon,
  LoaderSpinIcon,
  ExternalLinkIcon,
  StarIcon,
  ModrinthIcon,
  CurseForgeIcon,
  FabricLoaderIcon,
  ForgeLoaderIcon,
  NeoForgeLoaderIcon,
  PackageIcon
} from '../../icons'
import { useStore, selectActiveInstance } from '../../store'
import type { ModSearchHit, LoaderType } from '@shared/types'

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function LoaderPill({ loader }: { loader: string }) {
  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    fabric: { label: 'Fabric', cls: 'loader-badge-fabric', icon: <FabricLoaderIcon size={10} /> },
    forge: { label: 'Forge', cls: 'loader-badge-forge', icon: <ForgeLoaderIcon size={10} /> },
    neoforge: { label: 'NeoForge', cls: 'loader-badge-neoforge', icon: <NeoForgeLoaderIcon size={10} /> },
    quilt: { label: 'Quilt', cls: 'loader-badge-quilt' }
  }
  const { label, cls, icon } = map[loader.toLowerCase()] ?? { label: loader, cls: 'badge-zinc' }
  return (
    <span className={cls}>
      {icon}
      {label}
    </span>
  )
}

interface ModCardProps {
  mod: ModSearchHit
  installedFileIds?: Set<string>
}

export function ModCard({ mod, installedFileIds }: ModCardProps) {
  const [installing, setInstalling] = useState(false)
  const activeInstance = useStore(selectActiveInstance)
  const addInstalledMod = useStore((s) => s.addInstalledMod)

  const isInstalled = installedFileIds?.has(mod.id)

  const handleInstall = async () => {
    if (!activeInstance) {
      toast.error('Select an instance first')
      return
    }
    setInstalling(true)
    try {
      const installed = await window.api.installMod({
        instanceId: activeInstance.id,
        modId: mod.id,
        versionId: 'auto',
        source: mod.source
      })
      addInstalledMod(activeInstance.id, installed)
      toast.success(`Installed ${mod.title}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Installation failed'
      toast.error(msg)
    } finally {
      setInstalling(false)
    }
  }

  const openPage = () => {
    const url =
      mod.source === 'modrinth'
        ? `https://modrinth.com/mod/${mod.slug}`
        : `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`
    window.api.openExternal(url)
  }

  return (
    <div className="card-hover group flex flex-col overflow-hidden animate-fade-in">
      {/* Icon + Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 shrink-0 overflow-hidden flex items-center justify-center">
          {mod.iconUrl ? (
            <img
              src={mod.iconUrl}
              alt={mod.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <PackageIcon size={20} className="text-zinc-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 truncate leading-tight">
              {mod.title}
            </h3>
            <span
              className={`badge shrink-0 text-[10px] ${
                mod.source === 'modrinth' ? 'badge-emerald' : 'badge-amber'
              }`}
            >
              {mod.source === 'modrinth' ? (
                <ModrinthIcon size={9} />
              ) : (
                <CurseForgeIcon size={9} />
              )}
              {mod.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{mod.author}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 px-4 pb-3 line-clamp-2 leading-relaxed flex-1">
        {mod.description}
      </p>

      {/* Loaders */}
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {mod.loaders.slice(0, 3).map((l) => (
          <LoaderPill key={l} loader={l} />
        ))}
        {mod.versions.slice(0, 2).map((v) => (
          <span key={v} className="badge-zinc text-[10px]">
            {v}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <DownloadIcon size={11} />
            {formatDownloads(mod.downloads)}
          </span>
          {mod.followers !== undefined && (
            <span className="flex items-center gap-1">
              <StarIcon size={11} />
              {formatDownloads(mod.followers)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 no-drag">
          <button
            onClick={openPage}
            className="btn-ghost py-1.5 px-2 text-xs"
            title="View on mod page"
          >
            <ExternalLinkIcon size={12} />
          </button>

          <button
            onClick={handleInstall}
            disabled={installing || isInstalled}
            className={`btn-primary py-1.5 px-3 text-xs ${
              isInstalled ? 'bg-emerald-700/40 hover:bg-emerald-700/40 text-emerald-300' : ''
            }`}
          >
            {installing ? (
              <LoaderSpinIcon size={12} />
            ) : isInstalled ? (
              'Installed'
            ) : (
              <>
                <DownloadIcon size={12} />
                Install
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
