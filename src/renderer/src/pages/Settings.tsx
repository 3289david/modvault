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
  JavaIcon,
  UserIcon,
  RocketIcon
} from '../icons'
import { useStore } from '../store'
import type { Settings } from '@shared/types'

export function Settings() {
  const storeSettings = useStore((s) => s.settings)
  const setStoreSettings = useStore((s) => s.setSettings)
  const auth = useStore((s) => s.auth)
  const setAuth = useStore((s) => s.setAuth)
  const setShowAuthModal = useStore((s) => s.setShowAuthModal)

  const [form, setForm] = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [javaInfo, setJavaInfo] = useState<{ path: string; version: string } | null>(null)
  const [detectingJava, setDetectingJava] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'launch' | 'account' | 'about'>('general')

  useEffect(() => {
    if (storeSettings) setForm(storeSettings)
  }, [storeSettings])

  useEffect(() => {
    window.api.detectJava().then(setJavaInfo).catch(() => {})
  }, [])

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

  const selectJavaPath = async () => {
    const file = await window.api.selectFile([{ name: 'Java Executable', extensions: ['exe'] }])
    if (file) setForm((f) => ({ ...f, javaPath: file }))
  }

  const handleDetectJava = async () => {
    setDetectingJava(true)
    const info = await window.api.detectJava()
    setDetectingJava(false)
    if (info) {
      setJavaInfo(info)
      setForm((f) => ({ ...f, javaPath: info.path }))
      toast.success(`Found Java ${info.version}`)
    } else {
      toast.error('Java not found automatically. Install Java 17+ or 21+.')
    }
  }

  const handleLogout = async () => {
    await window.api.logout()
    setAuth(null)
    toast.success('Signed out')
  }

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'launch' as const, label: 'Launch' },
    { id: 'account' as const, label: 'Account' },
    { id: 'about' as const, label: 'About' }
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon size={20} className="text-violet-400" />
          <h1 className="page-title">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === t.id
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── General ─────────────────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <>
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
                <p className="text-[11px] text-zinc-600 mt-1">
                  Where Minecraft versions, libraries and assets are stored.
                </p>
              </div>
            </section>

            <section className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <ShieldIcon size={14} className="text-zinc-500" />
                API Keys
              </h2>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1">
                  <div className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                    CurseForge API Key
                    <span className="badge-emerald text-[10px]">
                      <CheckIcon size={9} />
                      Configured
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Built into this build. CurseForge search is fully enabled.
                  </p>
                </div>
                <div className="text-xs font-mono text-zinc-700 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 select-none">
                  ••••••••••••••••
                </div>
              </div>
            </section>

            <section className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <SettingsIcon size={14} className="text-zinc-500" />
                Defaults
              </h2>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Default Mod Loader
                </label>
                <select
                  className="input text-xs w-48"
                  value={form.defaultLoader ?? 'fabric'}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultLoader: e.target.value as Settings['defaultLoader']
                    }))
                  }
                >
                  <option value="fabric">Fabric</option>
                  <option value="forge">Forge</option>
                  <option value="neoforge">NeoForge</option>
                  <option value="quilt">Quilt</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-medium text-zinc-300">Auto-Check Conflicts</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    Scan for conflicts when switching instances
                  </div>
                </div>
                <button
                  onClick={() =>
                    setForm((f) => ({ ...f, autoCheckConflicts: !f.autoCheckConflicts }))
                  }
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
          </>
        )}

        {/* ── Launch ──────────────────────────────────────────────────────── */}
        {activeTab === 'launch' && (
          <>
            <section className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <JavaIcon size={14} className="text-zinc-500" />
                Java Runtime
              </h2>

              {javaInfo && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <CheckIcon size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-emerald-300">
                      Java {javaInfo.version} detected
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 break-all">
                      {javaInfo.path}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Java Executable Path
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-xs"
                    value={form.javaPath ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, javaPath: e.target.value }))}
                    placeholder="Leave blank to auto-detect"
                  />
                  <button onClick={selectJavaPath} className="btn-secondary px-3">
                    <FolderIcon size={14} />
                  </button>
                  <button
                    onClick={handleDetectJava}
                    disabled={detectingJava}
                    className="btn-secondary px-3"
                    title="Auto-detect"
                  >
                    {detectingJava ? <LoaderSpinIcon size={14} /> : <CheckIcon size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">
                  ModVault checks your .minecraft runtime first, then JAVA_HOME, then system PATH.
                  MC 1.17–1.20 needs Java 17. MC 1.21+ needs Java 21.
                </p>
              </div>
            </section>

            <section className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <RocketIcon size={14} className="text-zinc-500" />
                Memory
              </h2>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-400">Maximum RAM</label>
                  <span className="text-xs font-mono text-violet-400">
                    {((form.maxMemoryMB ?? 4096) / 1024).toFixed(1)} GB
                  </span>
                </div>
                <input
                  type="range"
                  min={1024}
                  max={16384}
                  step={512}
                  value={form.maxMemoryMB ?? 4096}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxMemoryMB: Number(e.target.value) }))
                  }
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                  <span>1 GB</span><span>16 GB</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-400">Minimum RAM</label>
                  <span className="text-xs font-mono text-zinc-400">
                    {((form.minMemoryMB ?? 1024) / 1024).toFixed(1)} GB
                  </span>
                </div>
                <input
                  type="range"
                  min={512}
                  max={4096}
                  step={256}
                  value={form.minMemoryMB ?? 1024}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minMemoryMB: Number(e.target.value) }))
                  }
                  className="w-full accent-zinc-500"
                />
              </div>
            </section>

            <section className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300">JVM Arguments</h2>
              <input
                className="input w-full text-xs font-mono"
                value={form.jvmArgs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, jvmArgs: e.target.value }))}
                placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
              />
              <p className="text-[11px] text-zinc-600">
                Extra JVM flags separated by spaces. Leave blank for defaults.
              </p>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-zinc-300">Minimize on Launch</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    Minimize ModVault when the game starts
                  </div>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, closeOnLaunch: !f.closeOnLaunch }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.closeOnLaunch ? 'bg-violet-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      form.closeOnLaunch ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </section>
          </>
        )}

        {/* ── Account ─────────────────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <section className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <UserIcon size={14} className="text-zinc-500" />
              Minecraft Account
            </h2>

            {auth ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <UserIcon size={22} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-100">{auth.username}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {auth.type === 'microsoft' ? 'Microsoft Account' : 'Offline Account'}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-1 truncate">
                      {auth.uuid}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${
                      auth.type === 'microsoft'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    {auth.type === 'microsoft' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {auth.type === 'microsoft' && (
                    <button
                      onClick={async () => {
                        const r = await window.api.refreshAuth()
                        if (r) { setAuth(r); toast.success('Session refreshed') }
                        else toast.error('Refresh failed — please sign in again')
                      }}
                      className="btn-secondary text-xs"
                    >
                      <CheckIcon size={12} />
                      Refresh Session
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Sign in to launch Minecraft. Microsoft accounts work on all servers.
                  Offline mode works for single-player and LAN only.
                </p>
                <button onClick={() => setShowAuthModal(true)} className="btn-primary">
                  <UserIcon size={14} />
                  Sign In
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── About ────────────────────────────────────────────────────────── */}
        {activeTab === 'about' && (
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <ModVaultLogo size={32} />
              <div>
                <div className="text-sm font-semibold text-zinc-200">ModVault</div>
                <div className="text-xs text-zinc-500">v1.0.0 — Next-gen Minecraft Mod Workspace</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.api.openExternal('https://github.com/3289david/modvault')}
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
        )}

        {(activeTab === 'general' || activeTab === 'launch') && (
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
              {saving ? <LoaderSpinIcon size={14} /> : <CheckIcon size={14} />}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
