import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { store } from '../store'
import type { Instance, CreateInstanceConfig } from '../../shared/types'

function instancesDir(): string {
  return path.join(store.dataDir, 'instances')
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

export function getAll(): Instance[] {
  return store.getInstances()
}

export function getById(id: string): Instance | undefined {
  return store.getInstances().find((i) => i.id === id)
}

export function create(config: CreateInstanceConfig): Instance {
  const id = crypto.randomUUID()
  const instanceDir = path.join(instancesDir(), id)
  const modsFolder = config.modsFolder ?? path.join(instanceDir, 'mods')

  ensureDir(instanceDir)
  ensureDir(modsFolder)
  ensureDir(path.join(instanceDir, 'config'))
  ensureDir(path.join(instanceDir, 'saves'))
  ensureDir(path.join(instanceDir, 'resourcepacks'))
  ensureDir(path.join(instanceDir, 'shaderpacks'))
  ensureDir(path.join(instanceDir, 'logs'))

  const instance: Instance = {
    id,
    name: config.name,
    minecraftVersion: config.minecraftVersion,
    loader: config.loader,
    loaderVersion: config.loaderVersion ?? 'latest',
    modsFolder,
    description: config.description,
    createdAt: new Date().toISOString(),
    modCount: 0
  }

  const instances = store.getInstances()
  instances.push(instance)
  store.saveInstances(instances)

  return instance
}

export function update(id: string, patch: Partial<Instance>): Instance {
  const instances = store.getInstances()
  const idx = instances.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error(`Instance not found: ${id}`)
  instances[idx] = { ...instances[idx], ...patch }
  store.saveInstances(instances)
  return instances[idx]
}

export function remove(id: string) {
  const instance = getById(id)
  if (!instance) return

  const instanceDir = path.join(instancesDir(), id)
  if (fs.existsSync(instanceDir)) {
    fs.rmSync(instanceDir, { recursive: true, force: true })
  }

  const instances = store.getInstances().filter((i) => i.id !== id)
  store.saveInstances(instances)
  store.saveInstalledMods(id, [])
}

export function openFolder(id: string) {
  const instance = getById(id)
  if (!instance) return
  const { shell } = require('electron')
  shell.openPath(instance.modsFolder)
}

export function refreshModCount(id: string): number {
  const instance = getById(id)
  if (!instance) return 0
  if (!fs.existsSync(instance.modsFolder)) return 0
  const count = fs
    .readdirSync(instance.modsFolder)
    .filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled')).length
  update(id, { modCount: count })
  return count
}
