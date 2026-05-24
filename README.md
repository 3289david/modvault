# ModVault

**Next-generation Minecraft Mod Workspace for Windows**

ModVault is a desktop app that brings app-store-level simplicity to Minecraft mod management. Install mods from Modrinth and CurseForge, manage isolated instances, detect conflicts, and analyze crashes — all from one beautiful interface.

---

## Features

### Instance Management
- Create isolated Minecraft environments with independent mods, configs, and saves
- Switch between instances instantly from the sidebar
- Supports Fabric, Forge, NeoForge, Quilt, and Vanilla

### Mod Browser
- Search and install directly from **Modrinth** (free) and **CurseForge** (API key required)
- Filter by loader, Minecraft version, and category
- One-click install with automatic version selection

### Smart Library
- Enable/disable mods without deleting them
- Import local JAR files
- Conflict indicators per-mod

### Conflict Detection
- Detects known incompatible mod pairs (e.g., OptiFine + Sodium)
- Finds duplicate mod IDs
- Warns about missing required dependencies
- Loader mismatch detection

### JAR Analyzer
- Reads `fabric.mod.json`, `META-INF/mods.toml`, `mcmod.info` automatically
- Extracts mod ID, version, dependencies, and authors on install

### Crash Analyzer
- Paste or drag a crash log
- AI-like pattern matching identifies the root cause
- Actionable fix recommendations
- Detects mixin errors, OOM, missing deps, mod conflicts

### One-click Optimization
- Automatically installs the best performance mods for your loader
  - **Fabric**: Sodium, Lithium, FerriteCore, EntityCulling, Starlight, Krypton
  - **Forge**: Embeddium, FerriteCore, EntityCulling

---

## Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

### Build for Windows

```bash
npm run package
```

Outputs a Windows NSIS installer to `dist/`.

---

## CurseForge API Key

Go to [console.curseforge.com](https://console.curseforge.com) → Create API Key → paste it in **Settings → API Keys**.

Modrinth works without any API key.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 28 |
| UI framework | React 18 + TypeScript |
| Build tool | electron-vite + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Routing | React Router v6 |
| HTTP | axios |
| JAR parsing | adm-zip |

---

## Architecture

```
src/
├── main/           Electron main process
│   ├── services/   Core logic (JAR analysis, APIs, conflict detection)
│   └── ipc.ts      IPC handler registration
├── preload/        Context bridge (exposes window.api)
├── shared/         Shared TypeScript types
└── renderer/       React application
    └── src/
        ├── pages/      Dashboard, Browse, Library, Instances, Crash, Settings
        ├── components/ Layout, Mods, Instances, Shared
        ├── store/      Zustand store
        ├── hooks/      Electron IPC hooks
        └── icons/      SVG icon components
```

---

## License

MIT — ModVault is open source.
