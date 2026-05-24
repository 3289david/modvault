import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  SearchIcon,
  PackageIcon,
  LayersIcon,
  TerminalIcon,
  SettingsIcon,
  ChevronDownIcon,
  PlusIcon,
  AlertTriangleIcon,
  FabricLoaderIcon,
  ForgeLoaderIcon,
  NeoForgeLoaderIcon,
  QuiltLoaderIcon,
  LoaderSpinIcon
} from '../../icons'
import { useStore, selectActiveInstance, selectConflicts } from '../../store'
import type { Instance, LoaderType } from '@shared/types'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/browse', label: 'Browse Mods', icon: SearchIcon },
  { to: '/library', label: 'My Mods', icon: PackageIcon },
  { to: '/instances', label: 'Instances', icon: LayersIcon },
  { to: '/crash', label: 'Crash Analyzer', icon: TerminalIcon }
]

function LoaderIcon({ loader, size = 14 }: { loader: LoaderType; size?: number }) {
  switch (loader) {
    case 'fabric': return <FabricLoaderIcon size={size} />
    case 'forge': return <ForgeLoaderIcon size={size} />
    case 'neoforge': return <NeoForgeLoaderIcon size={size} />
    case 'quilt': return <QuiltLoaderIcon size={size} />
    default: return <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
  }
}

function LoaderDot({ loader }: { loader: LoaderType }) {
  const colors: Record<LoaderType, string> = {
    fabric: 'bg-blue-400',
    forge: 'bg-orange-400',
    neoforge: 'bg-amber-400',
    quilt: 'bg-purple-400',
    vanilla: 'bg-emerald-400'
  }
  return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[loader] ?? 'bg-zinc-400'}`} />
}

function InstanceItem({
  instance,
  active,
  onClick
}: {
  instance: Instance
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
        active
          ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      <LoaderIcon loader={instance.loader} size={14} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{instance.name}</div>
        <div className="text-[10px] text-zinc-600 truncate">
          {instance.minecraftVersion} · {instance.loader}
        </div>
      </div>
      {active && <div className="w-1 h-4 rounded-full bg-violet-500 shrink-0" />}
    </button>
  )
}

export function Sidebar() {
  const instances = useStore((s) => s.instances)
  const activeInstanceId = useStore((s) => s.activeInstanceId)
  const setActiveInstance = useStore((s) => s.setActiveInstance)
  const activeInstance = useStore(selectActiveInstance)
  const conflicts = useStore(selectConflicts)
  const instancesLoaded = useStore((s) => s.instancesLoaded)

  const errorCount = conflicts.filter((c) => c.severity === 'error').length
  const warnCount = conflicts.filter((c) => c.severity === 'warning').length

  return (
    <aside className="w-56 flex flex-col bg-zinc-950 border-r border-zinc-800/60 shrink-0">
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="section-title px-2 py-2 mt-1">Navigation</div>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-violet-600/20 text-violet-200 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-violet-400' : ''} />
                <span>{label}</span>
                {label === 'Crash Analyzer' && (errorCount + warnCount > 0) && (
                  <span className="ml-auto badge-red text-[10px] px-1.5 py-0.5">
                    {errorCount + warnCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Instances */}
        <div className="section-title px-2 pt-4 pb-2">Instances</div>
        {!instancesLoaded ? (
          <div className="flex items-center gap-2 px-3 py-2 text-zinc-600 text-xs">
            <LoaderSpinIcon size={12} /> Loading...
          </div>
        ) : instances.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-600">No instances yet</div>
        ) : (
          <div className="space-y-0.5">
            {instances.map((inst) => (
              <InstanceItem
                key={inst.id}
                instance={inst}
                active={inst.id === activeInstanceId}
                onClick={() => setActiveInstance(inst.id)}
              />
            ))}
          </div>
        )}

        <NavLink
          to="/instances"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-violet-400 hover:bg-zinc-800/40 transition-colors mt-1"
        >
          <PlusIcon size={12} />
          <span>New Instance</span>
        </NavLink>
      </nav>

      {/* Conflict summary */}
      {(errorCount > 0 || warnCount > 0) && (
        <div className="p-2 border-t border-zinc-800/60">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              errorCount > 0
                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            <AlertTriangleIcon size={12} />
            <span>
              {errorCount > 0
                ? `${errorCount} conflict${errorCount > 1 ? 's' : ''}`
                : `${warnCount} warning${warnCount > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      )}

      {/* Active instance info */}
      {activeInstance && (
        <div className="p-2 border-t border-zinc-800/60">
          <div className="px-3 py-2 rounded-lg bg-zinc-900/60">
            <div className="flex items-center gap-2 mb-1">
              <LoaderDot loader={activeInstance.loader} />
              <span className="text-xs font-medium text-zinc-300 truncate">{activeInstance.name}</span>
            </div>
            <div className="text-[10px] text-zinc-600">
              {activeInstance.modCount ?? 0} mods · MC {activeInstance.minecraftVersion}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="p-2 border-t border-zinc-800/60">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? 'bg-violet-600/20 text-violet-200'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`
          }
        >
          <SettingsIcon size={15} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}
