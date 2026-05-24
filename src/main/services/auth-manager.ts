import axios from 'axios'
import { BrowserWindow } from 'electron'
import { store } from '../store'
import type { AuthProfile } from '../../shared/types'

// Public Microsoft OAuth client ID used by the Minecraft community
const MS_CLIENT_ID = '00000000402b5328'
const MS_AUTH_URL = 'https://login.live.com/oauth20_authorize.srf'
const MS_TOKEN_URL = 'https://login.live.com/oauth20_token.srf'
const REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf'

// ── MCLC-compatible auth object ───────────────────────────────────────────────
export function getMCLCAuth(profile: AuthProfile) {
  if (profile.type === 'offline') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Authenticator } = require('minecraft-launcher-core')
    return Authenticator.getAuth(profile.username)
  }
  return {
    access_token: profile.accessToken,
    client_token: profile.clientToken,
    uuid: profile.uuid,
    name: profile.username,
    user_properties: '{}'
  }
}

// ── Microsoft OAuth ───────────────────────────────────────────────────────────
export async function loginMicrosoft(parentWin: BrowserWindow): Promise<AuthProfile> {
  return new Promise((resolve, reject) => {
    const authWin = new BrowserWindow({
      width: 520,
      height: 680,
      parent: parentWin,
      modal: true,
      title: 'Sign in with Microsoft — ModVault',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    authWin.setMenuBarVisibility(false)

    const authUrl =
      `${MS_AUTH_URL}?client_id=${MS_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=XboxLive.signin%20offline_access` +
      `&prompt=select_account`

    authWin.loadURL(authUrl)

    let handled = false

    const handleUrl = async (url: string) => {
      if (!url.startsWith(REDIRECT_URI) || handled) return
      handled = true

      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')
      const error = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error')

      try { authWin.destroy() } catch { /* already closed */ }

      if (error || !code) {
        reject(new Error(error ?? 'No auth code received'))
        return
      }

      try {
        const profile = await completeMicrosoftAuth(code)
        store.saveAuth(profile)
        resolve(profile)
      } catch (err) {
        reject(err)
      }
    }

    authWin.webContents.on('will-redirect', (_, url) => handleUrl(url))
    authWin.webContents.on('will-navigate', (_, url) => handleUrl(url))
    authWin.webContents.on('did-navigate', (_, url) => handleUrl(url))

    authWin.on('closed', () => {
      if (!handled) reject(new Error('Login cancelled'))
    })
  })
}

async function completeMicrosoftAuth(code: string): Promise<AuthProfile> {
  // 1. Exchange code → MS tokens
  const msTokens = await exchangeMsCode(code)

  // 2. Xbox Live
  const xblResp = await axios.post(
    'https://user.auth.xboxlive.com/user/authenticate',
    {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msTokens.access_token}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  )

  // 3. XSTS
  const xstsResp = await axios.post(
    'https://xsts.auth.xboxlive.com/xsts/authorize',
    {
      Properties: { SandboxId: 'RETAIL', UserTokens: [xblResp.data.Token] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  )

  const uhs = xstsResp.data.DisplayClaims.xui[0].uhs

  // 4. Minecraft token
  const mcResp = await axios.post(
    'https://api.minecraftservices.com/authentication/login_with_xbox',
    { identityToken: `XBL3.0 x=${uhs};${xstsResp.data.Token}` },
    { headers: { 'Content-Type': 'application/json' } }
  )

  // 5. Profile (username + UUID)
  const profileResp = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mcResp.data.access_token}` }
  })

  return {
    type: 'microsoft',
    username: profileResp.data.name,
    uuid: profileResp.data.id,
    accessToken: mcResp.data.access_token,
    clientToken: genToken(32),
    refreshToken: msTokens.refresh_token,
    expiresAt: Date.now() + mcResp.data.expires_in * 1000
  }
}

async function exchangeMsCode(code: string) {
  const body = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  })
  const resp = await axios.post(MS_TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return resp.data
}

// ── Token refresh ─────────────────────────────────────────────────────────────
export async function refreshAuth(profile: AuthProfile): Promise<AuthProfile | null> {
  if (profile.type === 'offline') return profile
  if (!profile.refreshToken) return null

  try {
    const body = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      refresh_token: profile.refreshToken,
      grant_type: 'refresh_token'
    })
    const msResp = await axios.post(MS_TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const xblResp = await axios.post(
      'https://user.auth.xboxlive.com/user/authenticate',
      {
        Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msResp.data.access_token}` },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      },
      { headers: { 'Content-Type': 'application/json' } }
    )

    const xstsResp = await axios.post(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      {
        Properties: { SandboxId: 'RETAIL', UserTokens: [xblResp.data.Token] },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      },
      { headers: { 'Content-Type': 'application/json' } }
    )

    const uhs = xstsResp.data.DisplayClaims.xui[0].uhs
    const mcResp = await axios.post(
      'https://api.minecraftservices.com/authentication/login_with_xbox',
      { identityToken: `XBL3.0 x=${uhs};${xstsResp.data.Token}` },
      { headers: { 'Content-Type': 'application/json' } }
    )

    const updated: AuthProfile = {
      ...profile,
      accessToken: mcResp.data.access_token,
      refreshToken: msResp.data.refresh_token,
      expiresAt: Date.now() + mcResp.data.expires_in * 1000
    }
    store.saveAuth(updated)
    return updated
  } catch {
    return null
  }
}

// ── Offline login ─────────────────────────────────────────────────────────────
export function loginOffline(username: string): AuthProfile {
  const profile: AuthProfile = {
    type: 'offline',
    username: username.trim().replace(/\s+/g, '_').slice(0, 16),
    uuid: offlineUUID(username),
    accessToken: '0',
    clientToken: genToken(32)
  }
  store.saveAuth(profile)
  return profile
}

function offlineUUID(username: string): string {
  // Minecraft-compatible offline UUID from OfflinePlayer:{name}
  const data = `OfflinePlayer:${username}`
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const a = (h1 >>> 0).toString(16).padStart(8, '0')
  const b = (h2 >>> 0).toString(16).padStart(8, '0')
  const full = (a + b).padStart(32, '0')
  return `${full.slice(0,8)}-${full.slice(8,12)}-3${full.slice(13,16)}-${full.slice(16,20)}-${full.slice(20,32)}`
}

function genToken(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export function getStoredAuth(): AuthProfile | null {
  return store.getAuth()
}

export function logout(): void {
  store.saveAuth(null)
}
