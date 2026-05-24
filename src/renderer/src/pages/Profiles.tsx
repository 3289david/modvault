import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  CheckIcon,
  TrashIcon,
  ZapIcon,
  PackageIcon,
  LoaderSpinIcon,
  XIcon,
  LayersIcon
} from '../icons'
import { useStore, selectActiveInstance, selectInstalledMods } from '../store'
import type { InstalledMod } from '@shared/types'

interface Profile {
  id: string
  name: string
  description?: string
  enabledModIds: string[]
  icon: string
  createdAt: string
}

const PRESET_PROFILES = [
  {
    id: 'fps',
    name: 'FPS Mode',
    description: 'Max performance — disables visual/cosmetic mods',
    icon: '⚡',
    filter: (m: InstalledMod) =>
      !m.categories.some((c) =>
        ['decoration', 'cosmetic', 'shader', 'visual', 'gui'].includes(c.toLowerCase())
      )
  },
  {
    id: 'vanilla-plus',
    name: 'Vanilla+',
    description: 'Keeps only quality-of-life mods',
    icon: '🌿',
    filter: (m: InstalledMod) =>
      m.categories.some((c) =>
        ['utility', 'food', 'qol', 'library'].includes(c.toLowerCase())
      ) || m.dependencies.length === 0
  },
  {
    id: 'streaming',
    name: 'Streaming',
    description: 'Performance + HUD mods for content creation',
    icon: '🎬',
    filter: (m: InstalledMod) =>
      m.categories.some((c) =>
        ['performance', 'hud', 'optimization', 'utility'].includes(c.toLowerCase())
      )
  },
  {
    id: 'all',
    name: 'All Mods',
    description: 'Enable everything',
    icon: '📦',
    filter: () => true
  }
]

function ProfileCard({
  profile,
  active,
  onApply,
  onDelete,
  applying,
  isPreset = false
}: {
  profile: Profile | typeof PRESET_PROFILES[number]
  active: boolean
  onApply: () => void
  onDelete?: () => void
  applying: boolean
  isPreset?: boolean
}) {
  return (
    <div
      className={`card p-4 flex flex-col gap-3 transition-all duration-200 ${
        active ? 'border-violet-500/50 bg-violet-500/5' : 'hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-base">
            {'icon' in profile ? profile.icon : '📋'}
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              {profile.name}
              {isPreset && <span className="badge-zinc text-[10px]">Preset</span>}
              {active && <span className="badge-violet text-[10px]">Active</span>}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {'description' in profile ? profile.description : ''}
            </div>
          </div>
        </div>
        {onDelete && !isPreset && (
          <button onClick={onDelete} className="btn-ghost p-1.5 text-zinc-600 hover:text-red-400">
            <TrashIcon size={13} />
          </button>
        )}
      </div>

      <button
        onClick={onApply}
        disabled={applying}
        className={`btn-${active ? 'secondary' : 'primary'} justify-center text-xs py-2`}
      >
        {applying ? <LoaderSpinIcon size={13} /> : active ? <CheckIcon size={13} /> : <ZapIcon size={13} />}
        {active ? 'Applied' : 'Apply Profile'}
      </button>
    </div>
  )
}

export function Profiles() {
  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore(selectInstalledMods)
  const updateMod = useStore((s) => s.updateInstalledMod)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const storageKey = `profiles-${activeInstance?.id ?? 'global'}`

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Profile[]
      setProfiles(saved)
      setActiveProfileId(localStorage.getItem(`${storageKey}-active`) ?? null)
    } catch { /* empty */ }
  }, [storageKey])

  const saveProfiles = (p: Profile[]) => {
    setProfiles(p)
    localStorage.setItem(storageKey, JSON.stringify(p))
  }

  const applyPreset = async (preset: typeof PRESET_PROFILES[number]) => {
    if (!activeInstance) { toast.error('Select an instance first'); return }
    setApplyingId(preset.id)
    let changed = 0
    for (const mod of installedMods) {
      const shouldEnable = preset.filter(mod)
      if (mod.enabled !== shouldEnable) {
        try {
          await window.api.toggleMod(activeInstance.id, mod.fileId, shouldEnable)
          updateMod(activeInstance.id, mod.fileId, { enabled: shouldEnable })
          changed++
        } catch { /* skip */ }
      }
    }
    setActiveProfileId(preset.id)
    localStorage.setItem(`${storageKey}-active`, preset.id)
    toast.success(`Applied "${preset.name}" — ${changed} mods toggled`)
    setApplyingId(null)
  }

  const applyCustomProfile = async (profile: Profile) => {
    if (!activeInstance) { toast.error('Select an instance first'); return }
    setApplyingId(profile.id)
    const enabledSet = new Set(profile.enabledModIds)
    let changed = 0
    for (const mod of installedMods) {
      const shouldEnable = enabledSet.has(mod.id)
      if (mod.enabled !== shouldEnable) {
        try {
          await window.api.toggleMod(activeInstance.id, mod.fileId, shouldEnable)
          updateMod(activeInstance.id, mod.fileId, { enabled: shouldEnable })
          changed++
        } catch { /* skip */ }
      }
    }
    setActiveProfileId(profile.id)
    localStorage.setItem(`${storageKey}-active`, profile.id)
    toast.success(`Applied "${profile.name}" — ${changed} mods toggled`)
    setApplyingId(null)
  }

  const saveCurrentAsProfile = () => {
    if (!newName.trim()) { toast.error('Name is required'); return }
    const profile: Profile = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      enabledModIds: installedMods.filter((m) => m.enabled).map((m) => m.id),
      icon: '📋',
      createdAt: new Date().toISOString()
    }
    saveProfiles([...profiles, profile])
    toast.success(`Saved profile "${profile.name}"`)
    setNewName(''); setNewDesc(''); setShowNew(false)
  }

  const deleteProfile = (id: string) => {
    saveProfiles(profiles.filter((p) => p.id !== id))
    if (activeProfileId === id) setActiveProfileId(null)
  }

  if (!activeInstance) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LayersIcon size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Select an instance to manage profiles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Profiles</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Switch between different mod load-outs with one click.
            </p>
          </div>
          <button onClick={() => setShowNew(!showNew)} className="btn-primary">
            <PlusIcon size={14} />
            Save Current
          </button>
        </div>

        {/* Save current as profile */}
        {showNew && (
          <div className="card p-5 space-y-3 animate-slide-up border-violet-500/30">
            <p className="text-xs text-zinc-400">
              Saving snapshot of {installedMods.filter((m) => m.enabled).length} currently enabled mods.
            </p>
            <input
              className="input text-sm"
              placeholder="Profile name (e.g. Create Playthrough)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <input
              className="input text-sm"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveCurrentAsProfile} className="btn-primary flex-1 justify-center">
                <CheckIcon size={14} />
                Save Profile
              </button>
            </div>
          </div>
        )}

        {/* Preset profiles */}
        <div>
          <h2 className="section-title mb-3">Built-in Profiles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_PROFILES.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p as unknown as Profile}
                active={activeProfileId === p.id}
                onApply={() => applyPreset(p)}
                applying={applyingId === p.id}
                isPreset
              />
            ))}
          </div>
        </div>

        {/* Custom profiles */}
        {profiles.length > 0 && (
          <div>
            <h2 className="section-title mb-3">Your Profiles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  active={activeProfileId === p.id}
                  onApply={() => applyCustomProfile(p)}
                  onDelete={() => deleteProfile(p.id)}
                  applying={applyingId === p.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
