import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useStore } from '../../store'
import {
  MicrosoftIcon,
  UserIcon,
  XIcon,
  LoaderSpinIcon,
  ShieldIcon
} from '../../icons'

export function AuthModal() {
  const setShowAuthModal = useStore((s) => s.setShowAuthModal)
  const setAuth = useStore((s) => s.setAuth)

  const [tab, setTab] = useState<'microsoft' | 'offline'>('microsoft')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMicrosoft = async () => {
    setLoading(true)
    try {
      const profile = await window.api.loginMicrosoft()
      setAuth(profile)
      toast.success(`Signed in as ${profile.username}`)
      setShowAuthModal(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg !== 'Login cancelled') toast.error(`Sign-in failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOffline = async () => {
    if (!username.trim()) { toast.error('Enter a username'); return }
    if (username.trim().length < 3) { toast.error('Username must be at least 3 characters'); return }
    setLoading(true)
    try {
      const profile = await window.api.loginOffline(username.trim())
      setAuth(profile)
      toast.success(`Signed in as ${profile.username} (offline)`)
      setShowAuthModal(false)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[420px] card p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldIcon size={18} className="text-violet-400" />
            <span className="font-semibold text-zinc-100">Sign In to Play</span>
          </div>
          <button
            onClick={() => setShowAuthModal(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setTab('microsoft')}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === 'microsoft'
                ? 'text-violet-400 border-b-2 border-violet-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Microsoft Account
          </button>
          <button
            onClick={() => setTab('offline')}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === 'offline'
                ? 'text-violet-400 border-b-2 border-violet-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Offline Mode
          </button>
        </div>

        <div className="p-6">
          {tab === 'microsoft' ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <MicrosoftIcon size={28} className="text-blue-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Sign in with Microsoft</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Opens a Microsoft login window. Required for playing on online servers.
                  Your credentials are never stored in plain text.
                </p>
              </div>

              <button
                onClick={handleMicrosoft}
                disabled={loading}
                className="w-full btn-primary py-3 justify-center"
              >
                {loading ? (
                  <><LoaderSpinIcon size={15} /> Opening Microsoft login...</>
                ) : (
                  <><MicrosoftIcon size={15} /> Sign in with Microsoft</>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
                  <UserIcon size={28} className="text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Offline Mode</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Play without a Microsoft account. Single-player and LAN worlds work fine.
                  Online servers with <code className="text-amber-400">online-mode=true</code> will
                  not be accessible.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Player Name
                </label>
                <input
                  className="input w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOffline()}
                  placeholder="Steve"
                  maxLength={16}
                  autoFocus
                />
                <p className="text-[10px] text-zinc-600 mt-1">3–16 characters, no spaces</p>
              </div>

              <button
                onClick={handleOffline}
                disabled={loading || !username.trim()}
                className="w-full btn-primary py-3 justify-center"
              >
                {loading ? (
                  <><LoaderSpinIcon size={15} /> Signing in...</>
                ) : (
                  <><UserIcon size={15} /> Play Offline</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
