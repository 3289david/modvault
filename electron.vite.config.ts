import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load .env — no prefix filter so CURSEFORGE_API_KEY is picked up
  const env = loadEnv(mode ?? 'production', process.cwd(), '')
  const cfKey = env.CURSEFORGE_API_KEY ?? ''

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        // Injected at build time — never stored in source or git
        __CF_API_KEY__: JSON.stringify(cfKey)
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@shared': resolve('src/shared')
        }
      },
      plugins: [react()]
    }
  }
})
