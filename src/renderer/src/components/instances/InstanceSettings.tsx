import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  XIcon,
  ShieldIcon,
  FolderIcon,
  RefreshIcon,
  UploadIcon,
  LoaderSpinIcon,
  AlertTriangleIcon,
  CheckIcon
} from '../../icons'
import { LoaderReplaceModal } from '../mods/LoaderReplaceModal'
import { useStore } from '../../store'
import type { Instance, LoaderType } from '@shared/types'
import { MC_VERSIONS } from '@shared/types'

interface Props {
  instance: Instance
  onClose: () => void
  onUpdated: (inst: Instance) => void
}

export function InstanceSettings({ instance, onClose, onUpdated }: Props) {
  const [name, setName] = useState(instance.name)
  const [mcVersion, setMcVersion] = useState(instance.minecraftVersion)
  const [description, setDescription] = useState(instance.description ?? '')
  const [saving, setSaving] = useState(false)
  const [importingMc, setImportingMc] = useState(false)
  const [safeModing, setSafeModing] = useState(false)
  const [showLoaderReplace, setShowLoaderReplace] = useState(false)
  const [pendingLoader, setPendingLoader] = useState<LoaderType | null>(null)
  const [loader, setLoader] = useState<LoaderType>(instance.loader)

  const upsertInstance = useStore((s) => s.upsertInstance)
  const installedMods = useStore((s) => s.installedMods[instance.id] ?? [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await window.api.updateInstance(instance.id, {
        name: name.trim() || instance.name,
        minecraftVersion: mcVersion,
        description: description.trim() || undefined,
        loader
      })
      upsertInstance(updated)
      onUpdated(updated)
      toast.success('Settings saved')
      onClose()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLoaderChange = (newLoader: LoaderType) => {
    if (newLoader === loader) return
    const incompatible = installedMods.filter(
      (m) => m.enabled && !m.loaders.includes(newLoader) && m.loaders.length > 0
    )
    if (incompatible.length > 0) {
      setPendingLoader(newLoader)
      setShowLoaderReplace(true)
    } else {
      setLoader(newLoader)
    }
  }

  const handleSafeMode = async () => {
    setSafeModing(true)
    // Disable the 3 most recently installed mods
    const recent = [...installedMods]
      .sort((a, b) => new Date(b.installDate).getTime() - new Date(a.installDate).getTime())
      .slice(0, 3)
      .filter((m) => m.enabled)

    let disabled = 0
    for (const mod of recent) {
      try {
        await window.api.toggleMod(instance.id, mod.fileId, false)
        useStore.getState().updateInstalledMod(instance.id, mod.fileId, { enabled: false })
        disabled++
      } catch { /* skip */ }
    }
    setSafeModing(false)
    toast.success(`Safe Mode: disabled ${disabled} recently-installed mod${disabled !== 1 ? 's' : ''}`)
  }

  const handleImportFromMc = async () => {
    setImportingMc(true)
    try {
      const mods = await window.api.importFromFolder(instance.id)
      if (!mods.length) {
        toast('No JAR files found in the selected folder')
        return
      }
      for (const mod of mods) {
        useStore.getState().addInstalledMod(instance.id, mod)
      }
      toast.success(`Imported ${mods.length} mod${mods.length !== 1 ? 's' : ''} successfully`)
    } catch {
      toast.error('Import failed')
    } finally {
      setImportingMc(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Instance Settings</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{instance.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <XIcon size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* MC Version */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Minecraft Version</label>
            <select className="input appearance-none" value={mcVersion} onChange={(e) => setMcVersion(e.target.value)}>
              {MC_VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Loader */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Mod Loader
              {loader !== instance.loader && (
                <span className="ml-2 badge-amber text-[10px]">Changed — will suggest replacements</span>
              )}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['fabric', 'forge', 'neoforge', 'quilt'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLoaderChange(l)}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all capitalize ${
                    loader === l
                      ? 'border-violet-500/60 bg-violet-500/10 text-violet-200'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>

          {/* Advanced actions */}
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <p className="text-xs text-zinc-500 mb-3">Advanced</p>

            <button
              onClick={handleSafeMode}
              disabled={safeModing}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                {safeModing ? <LoaderSpinIcon size={15} className="text-amber-400" /> : <ShieldIcon size={15} className="text-amber-400" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Safe Mode</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Disable the 3 most recently installed mods (crash recovery)</div>
              </div>
            </button>

            <button
              onClick={() => window.api.openInstanceFolder(instance.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FolderIcon size={15} className="text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Open Mods Folder</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Browse the raw mods directory in Explorer</div>
              </div>
            </button>

            <button
              onClick={handleImportFromMc}
              disabled={importingMc}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                {importingMc ? <LoaderSpinIcon size={15} className="text-emerald-400" /> : <UploadIcon size={15} className="text-emerald-400" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Import from Folder</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Import JARs from an existing mods folder</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <LoaderSpinIcon size={14} /> : <CheckIcon size={14} />}
            Save
          </button>
        </div>
      </div>

      <LoaderReplaceModal
        open={showLoaderReplace}
        targetLoader={pendingLoader ?? 'fabric'}
        onClose={() => { setShowLoaderReplace(false); setPendingLoader(null) }}
        onComplete={() => { if (pendingLoader) setLoader(pendingLoader) }}
      />
    </div>
  )
}
