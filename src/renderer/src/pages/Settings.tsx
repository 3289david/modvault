import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  SettingsIcon,
  FolderIcon,
  LoaderSpinIcon,
  CheckIcon,
  ExternalLinkIcon,
  ShieldIcon,
  ModVaultLogo,
  InfoIcon
} from '../icons'
import { useStore } from '../store'
import type { Settings } from '@shared/types'
import { MC_VERSIONS } from '@shared/types'

export function Settings() {
  const storeSettings = useStore((s) => s.settings)
  const setStoreSettings = useStore((s) => s.setSettings)

  const [form, setForm] = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (storeSettings) setForm(storeSettings)
  }, [storeSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.api.saveSettings(form)
      const updated = await window.api.getSettings()
      setStoreSettings(updated)
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const selectMinecraftPath = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setForm((f) => ({ ...f, minecraftPath: folder }))
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon size={20} className="text-violet-400" />
          <h1 className="page-title">Settings</h1>
        </div>

        {/* Paths */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FolderIcon size={14} className="text-zinc-500" />
            Paths
          </h2>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Minecraft Installation Path
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs"
                value={form.minecraftPath ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, minecraftPath: e.target.value }))}
                placeholder="%APPDATA%\.minecraft"
              />
              <button onClick={selectMinecraftPath} className="btn-secondary px-3">
                <FolderIcon size={14} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Used for reading existing mods and crash logs.
            </p>
          </div>
        </section>

        {/* API Keys */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <ShieldIcon size={14} className="text-zinc-500" />
            API Keys
          </h2>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>CurseForge API Key</span>
              <button
                onClick={() => window.api.openExternal('https://console.curseforge.com')}
                className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-[11px] font-normal"
              >
                Get API Key <ExternalLinkIcon size={10} />
              </button>
            </label>
            <input
              className="input text-xs font-mono"
              type="password"
              value={form.curseforgeApiKey ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, curseforgeApiKey: e.target.value }))}
              placeholder="$2a$10$..."
            />
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Required for CurseForge mod search. Modrinth works without a key.
            </p>
          </div>
        </section>

        {/* Defaults */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <SettingsIcon size={14} className="text-zinc-500" />
            Defaults
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Default Mod Loader
              </label>
              <select
                className="input text-xs"
                value={form.defaultLoader ?? 'fabric'}
                onChange={(e) => setForm((f) => ({ ...f, defaultLoader: e.target.value as Settings['defaultLoader'] }))}
              >
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
                <option value="quilt">Quilt</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-medium text-zinc-300">Auto-Check Conflicts</div>
              <div className="text-[11px] text-zinc-600 mt-0.5">
                Scan for conflicts when switching instances
              </div>
            </div>
            <button
              onClick={() => setForm((f) => ({ ...f, autoCheckConflicts: !f.autoCheckConflicts }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.autoCheckConflicts ? 'bg-violet-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  form.autoCheckConflicts ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* About */}
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <ModVaultLogo size={28} />
            <div>
              <div className="text-sm font-semibold text-zinc-200">ModVault</div>
              <div className="text-xs text-zinc-500">v1.0.0 — Next-gen Minecraft Mod Workspace</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.api.openExternal('https://github.com/danwoo/modvault')}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              <ExternalLinkIcon size={12} />
              GitHub
            </button>
            <button
              onClick={() => window.api.openExternal('https://modrinth.com')}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              <ExternalLinkIcon size={12} />
              Modrinth
            </button>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
            {saving ? (
              <LoaderSpinIcon size={14} />
            ) : saved ? (
              <CheckIcon size={14} />
            ) : (
              <CheckIcon size={14} />
            )}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
