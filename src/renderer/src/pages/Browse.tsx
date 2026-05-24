import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ModCard } from '../components/mods/ModCard'
import { ModDetailPanel } from '../components/mods/ModDetailPanel'
import {
  SearchIcon,
  LoaderSpinIcon,
  FilterIcon,
  ModrinthIcon,
  CurseForgeIcon,
  RefreshIcon,
  PackageIcon
} from '../icons'
import { useStore, selectActiveInstance, selectInstalledMods } from '../store'
import type { ModSearchHit, LoaderType } from '@shared/types'
import { MC_VERSIONS, MOD_CATEGORIES } from '@shared/types'

type Source = 'modrinth' | 'curseforge' | 'both'

const LOADERS: { value: string; label: string }[] = [
  { value: '', label: 'All Loaders' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' }
]

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded shimmer" />
          <div className="h-3 w-1/2 rounded shimmer" />
        </div>
      </div>
      <div className="px-4 pb-3 space-y-1.5">
        <div className="h-3 rounded shimmer" />
        <div className="h-3 w-4/5 rounded shimmer" />
      </div>
      <div className="px-4 pb-3 flex gap-2">
        <div className="h-5 w-14 rounded shimmer" />
        <div className="h-5 w-12 rounded shimmer" />
      </div>
      <div className="border-t border-zinc-800/60 px-4 py-3 flex justify-between">
        <div className="h-4 w-16 rounded shimmer" />
        <div className="h-7 w-20 rounded-lg shimmer" />
      </div>
    </div>
  )
}

export function Browse() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<Source>('modrinth')
  const [loader, setLoader] = useState('')
  const [mcVersion, setMcVersion] = useState('')
  const [category, setCategory] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMod, setSelectedMod] = useState<ModSearchHit | null>(null)

  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore(selectInstalledMods)
  const installedIds = new Set(installedMods.map((m) => m.projectId ?? m.id))

  const LIMIT = 24
  const searchRef = useRef<HTMLInputElement>(null)

  const search = useCallback(
    async (newOffset = 0, append = false) => {
      setLoading(true)
      try {
        const params = {
          query,
          loader: loader || activeInstance?.loader || undefined,
          mcVersion: mcVersion || activeInstance?.minecraftVersion || undefined,
          category: category || undefined,
          offset: newOffset,
          limit: LIMIT
        }

        if (source === 'both') {
          const [mr, cf] = await Promise.all([
            window.api.searchModrinth(params),
            window.api.searchCurseForge(params)
          ])
          const merged = [...mr.hits, ...cf.hits].sort((a, b) => b.downloads - a.downloads)
          setResults(append ? (prev) => [...prev, ...merged] : merged)
          setTotal(mr.total + cf.total)
        } else if (source === 'modrinth') {
          const r = await window.api.searchModrinth(params)
          setResults(append ? (prev) => [...prev, ...r.hits] : r.hits)
          setTotal(r.total)
        } else {
          const r = await window.api.searchCurseForge(params)
          setResults(append ? (prev) => [...prev, ...r.hits] : r.hits)
          setTotal(r.total)
        }
        setOffset(newOffset)
      } finally {
        setLoading(false)
      }
    },
    [query, source, loader, mcVersion, category, activeInstance]
  )

  useEffect(() => {
    search(0)
  }, [source, loader, mcVersion, category])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    search(0)
  }

  const handleLoadMore = () => search(offset + LIMIT, true)

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-950/80 p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                ref={searchRef}
                className="input pl-9"
                placeholder="Search mods... (e.g. Create, Sodium, JEI)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-5">
              {loading ? <LoaderSpinIcon size={14} /> : <SearchIcon size={14} />}
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary px-4 ${showFilters ? 'border-violet-500/50 text-violet-300' : ''}`}
            >
              <FilterIcon size={14} />
            </button>
          </form>

          {/* Source tabs */}
          <div className="flex items-center gap-2">
            {(
              [
                { value: 'modrinth', label: 'Modrinth', icon: <ModrinthIcon size={12} /> },
                { value: 'curseforge', label: 'CurseForge', icon: <CurseForgeIcon size={12} /> },
                { value: 'both', label: 'Both', icon: <SearchIcon size={12} /> }
              ] as const
            ).map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setSource(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  source === value
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs text-zinc-600">
              {total > 0 && `${total.toLocaleString()} results`}
            </span>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-3 gap-2 animate-slide-up pt-1">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Loader</label>
                <select
                  className="input text-xs py-1.5"
                  value={loader}
                  onChange={(e) => setLoader(e.target.value)}
                >
                  {LOADERS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">MC Version</label>
                <select
                  className="input text-xs py-1.5"
                  value={mcVersion}
                  onChange={(e) => setMcVersion(e.target.value)}
                >
                  <option value="">All Versions</option>
                  {MC_VERSIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Category</label>
                <select
                  className="input text-xs py-1.5"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {MOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4">
          {loading && results.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <PackageIcon size={40} className="text-zinc-700 mb-4" />
              <h3 className="text-base font-medium text-zinc-400 mb-1">No mods found</h3>
              <p className="text-sm text-zinc-600">Try a different search term or adjust your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((mod) => (
                  <div key={`${mod.source}-${mod.id}`} onClick={() => setSelectedMod(mod)} className="cursor-pointer">
                    <ModCard mod={mod} installedFileIds={installedIds} />
                  </div>
                ))}
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
              </div>

              {results.length < total && !loading && (
                <div className="flex justify-center mt-6">
                  <button onClick={handleLoadMore} className="btn-secondary px-8">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      <ModDetailPanel mod={selectedMod} onClose={() => setSelectedMod(null)} />
    </div>
  )
}
