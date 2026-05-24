# ModVault

**Next-generation Minecraft Mod Workspace for Windows**

ModVault is a fully-featured desktop Minecraft mod manager — think Prism Launcher meets an app store. Install mods from Modrinth and CurseForge, launch real Minecraft instances with any mod loader, auto-detect dependency problems, import modpacks, and analyze crash reports, all from one dark-themed interface.

---

## Feature List

### Instance Management
- **Isolated instances** — each instance has its own `mods/`, `config/`, `saves/`, `resourcepacks/`, and `shaderpacks/` folder; shared `.minecraft` libraries/assets avoid re-downloading
- Create instances for Fabric, Forge, NeoForge, Quilt, or Vanilla
- Rename, change version, change loader, and add a description from Instance Settings
- Switch active instance from the sidebar — all tabs update instantly
- Delete instance (removes mods folder, keeps shared game data)
- Open mods folder directly in Windows Explorer
- Per-instance mod count shown on the card

### Real Minecraft Launcher (built-in)
- Launch Minecraft directly from within the app — no external launcher needed
- Uses **minecraft-launcher-core** for full, real game launching
- Downloads game assets, libraries, and version JSON automatically
- Streams live game output to a built-in **Game Console** panel
- Filter console output by type: All / Info / Warn / Error / Debug
- Auto-scroll with "Jump to bottom" button
- Progress bar showing download stages (checking → downloading → launching → running)
- Stop the running game from the app
- Multiple instances can be tracked; console opens per-instance

### Mod Loader Installation
- **Fabric** — fetches the loader profile JSON from `meta.fabricmc.net` and writes it to `.minecraft/versions/`
- **Quilt** — same, from `meta.quiltmc.org`
- **Forge** — downloads the installer JAR from Maven and runs it headlessly
- **NeoForge** — same pattern from `maven.neoforged.net`
- Loader is installed automatically on first launch if not present
- `loaderInstalled` flag cached so subsequent launches skip reinstallation

### Microsoft & Offline Authentication
- Full **Microsoft OAuth2** login chain: auth code → MS tokens → Xbox Live → XSTS → Minecraft access token → profile UUID
- Offline mode with custom username (no Minecraft account required)
- Auth token auto-refresh before each launch (checks expiry with 60s buffer)
- Auth state persisted across restarts
- Sign out from Settings → Account tab

### Java Detection (6-source priority chain)
1. Mojang-bundled JRE in `.minecraft/runtime/` (correct version per MC version: `java-runtime-delta` for 1.21+, `java-runtime-gamma` for 1.17–1.20, `jre-legacy` for older)
2. `JAVA_HOME` environment variable
3. `java` on system PATH
4. Windows Registry (`HKLM\SOFTWARE\JavaSoft`)
5. Common install paths (`C:\Program Files\Java`, `C:\Program Files\Eclipse Adoptium`, etc.)
6. Custom path override in Settings → Launch
- Detected Java version and source displayed in Settings

### Mod Browser
- Search **Modrinth** (no key required) and **CurseForge** (API key required) simultaneously or separately
- Filter by: mod loader, Minecraft version, category (15 categories supported)
- Infinite scroll with "Load More"
- Download count and follower count shown per card
- Loader badges on every result card
- **Loader incompatibility warning** — amber banner on cards and in the detail panel when a mod doesn't officially support the active instance's loader
- **Already Installed** indicator — green checkmark when mod is present in the active instance
- One-click install (auto-selects best compatible release version)

### Mod Detail Panel
- Slides in from the right on mod click — no navigation away
- Full version list filtered by active instance loader + MC version
- Install any specific version directly
- Release type badges: release / beta / alpha
- Supported loaders and MC version chips
- Category tags
- Download count
- Open mod page on Modrinth or CurseForge in browser
- **Loader incompatibility warning** when mod doesn't support instance's loader
- **You Might Also Like** — shows up to 3 related mods (same category, not yet installed) fetched from Modrinth automatically

### Auto-Dependency Installation
- After installing any Modrinth mod, the app fetches the version's declared dependencies via the Modrinth API
- Cross-references against already-installed mods in the instance
- Shows a **Dependencies Prompt** modal listing:
  - Required dependencies (highlighted in red)
  - Optional dependencies
  - Icon, name, and slug for each
- "Install X Required" button installs all missing required deps in one click
- Per-dep install buttons for individual selection

### My Mods Library
- List all installed mods for the active instance
- Enable / disable mods (renames `.jar` ↔ `.jar.disabled` — no data loss)
- Uninstall (deletes the JAR file and removes from registry)
- Per-mod conflict badges (error or warning)
- **Category filter chips** — chips appear dynamically based on which categories the installed mods actually belong to; click to filter the list
- Filter tabs: All / Enabled / Disabled / Conflicting
- Search by name or description
- Refresh button re-reads the mods folder from disk
- **Import JAR** — file picker installs any local `.jar` file (JAR is analyzed, metadata extracted)
- **Import from Folder** — scans an entire folder and imports every `.jar` found, with count feedback
- **Apply to .minecraft** — copies all enabled instance mods to the vanilla `.minecraft/mods` folder and opens it in Explorer

### Modpack Import
- Import **Modrinth packs** (`.mrpack`) — parses `modrinth.index.json`, downloads all client-side mod files, applies `overrides/` and `client-overrides/` to the instance directory
- Import **CurseForge packs** (`.zip`) — parses `manifest.json`, downloads mods via CF API (gracefully skips mods that have redistribution disabled), applies overrides
- Auto-detects pack format from zip contents
- Creates a new instance automatically with the correct loader + version
- Live progress bar: current file count / total files
- Success state shows instance name and mod count with a "Go to Instance" button
- Accessible from Library toolbar → **Import Pack**

### Loader Auto-Replacement
- Changing loader on an instance with installed mods triggers a **Loader Replace Modal**
- Shows all mods incompatible with the new loader, with known alternatives pre-filled:
  - Sodium ↔ Embeddium (Fabric ↔ Forge)
  - Lithium ↔ Canary
  - Iris ↔ Oculus
  - Starlight ↔ Starlight (Forge port)
  - And 10+ more mappings
- Toggle alternative installation per-mod
- Auto-installs selected alternatives in one click

### Conflict Detection
- Detects **known incompatible pairs** (e.g., OptiFine + Sodium, Phosphor + Starlight, LazyDFU + SmoothBoot)
- Detects **duplicate mod IDs** across enabled mods
- Detects **missing required dependencies** declared in mod metadata
- Detects **loader mismatches** (mod built for Fabric loaded in Forge instance)
- Per-mod conflict badge in the Library list
- Inline conflict summary panel at the top of the Library (click to filter to conflicting mods)
- Conflict check runs automatically on mod install/uninstall/toggle

### Visual Dependency Graph
- Switch to **Dependencies** tab in the Library
- Force-directed graph showing all installed mods and their dependency relationships
- Node color-coded by loader type
- Click a node to highlight its connections

### JAR Analyzer
- Reads `fabric.mod.json` (Fabric/Quilt), `META-INF/mods.toml` (Forge/NeoForge), and `mcmod.info` (legacy) automatically on every install
- Extracts: mod ID, display name, version, description, authors, dependencies, supported loaders, categories
- Falls back to filename-based metadata for unknown JAR formats

### Crash Log Analyzer
- Paste or drag a `.log` or `.txt` crash report into the Crash page
- Pattern matching identifies root cause from stack trace
- Cause types: mod conflict, missing dependency, Java error, out-of-memory, mixin error, unknown
- Lists suspects with confidence level (high / medium / low) and reason
- Actionable fix recommendations per cause type
- Detects Minecraft version and loader version from the log header

### Profiles
- Named profiles (presets + custom) that toggle sets of mods on/off together
- Built-in preset profiles: Performance, Lightweight, Vanilla+
- Create custom profiles by name, apply them to any instance
- Profile state persisted across restarts

### Safe Mode
- In Instance Settings → Advanced → **Safe Mode**: disables the 3 most recently installed mods
- Designed for crash recovery — undo the last few installs without knowing which one broke the game
- Reports how many mods were disabled

### One-Click Optimization
- From the Dashboard: **Optimize** button installs the best-known performance mods for the active instance's loader
  - **Fabric / Quilt**: Sodium, Lithium, FerriteCore, Entity Culling, Starlight, Krypton, LazyDFU
  - **Forge / NeoForge**: Embeddium, FerriteCore, Entity Culling

### Settings
- **General**: `.minecraft` folder path (auto-detected), default loader, auto conflict check toggle
- **Launch**: Java path (with auto-detect button), min/max RAM sliders (512 MB – 16 GB), custom JVM arguments, minimize app on launch toggle
- **Account**: signed-in profile display (username, UUID, auth type), refresh session, sign out
- **About**: app version info, links

---

## Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Windows 10 / 11

### Install & Run (development)

```bash
git clone <repo>
cd mc_mode_app
npm install
npm run dev
```

### CurseForge API Key (optional)

Without a key, CurseForge search and CurseForge modpack import are disabled. Modrinth works with no key.

The API key is embedded at build time — it never appears in source files or git history. It is stored in `.env` (gitignored) and injected via Vite `define`:

```
# .env (DO NOT COMMIT)
CF_API_KEY=your_key_here
```

Get a key at [console.curseforge.com](https://console.curseforge.com) → Create API Key.

### Build for Windows

```bash
npm run build     # compile bundles
npm run package   # produce NSIS installer → dist/
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| UI framework | React 18 + TypeScript |
| Build tool | electron-vite 2 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State management | Zustand |
| Routing | React Router v6 (HashRouter) |
| HTTP | axios |
| Minecraft launching | minecraft-launcher-core |
| JAR / ZIP parsing | adm-zip |
| Notifications | react-hot-toast |

---

## Architecture

```
src/
├── main/                     Electron main process
│   ├── services/
│   │   ├── auth-manager.ts       Microsoft OAuth2 + offline auth
│   │   ├── conflict-detector.ts  Known-pair + duplicate + dep conflict logic
│   │   ├── crash-analyzer.ts     Log pattern matching
│   │   ├── curseforge-api.ts     CurseForge REST client
│   │   ├── dependency-resolver.ts  Post-install dep checking via Modrinth API
│   │   ├── instance-manager.ts   CRUD for instances + folder creation
│   │   ├── jar-analyzer.ts       fabric.mod.json / mods.toml / mcmod.info reader
│   │   ├── java-manager.ts       6-source Java detection
│   │   ├── loader-installer.ts   Fabric / Quilt / Forge / NeoForge installation
│   │   ├── minecraft-launcher.ts  MCLC wrapper — launch, stop, log streaming
│   │   ├── mod-installer.ts      Download + install + toggle + import JAR
│   │   ├── modpack-importer.ts   .mrpack + CurseForge .zip import
│   │   ├── modrinth-api.ts       Modrinth REST client
│   │   └── version-manager.ts    Mojang + loader version manifest fetching
│   ├── store.ts              JSON-file persistent store (userData)
│   └── ipc.ts                All ipcMain.handle registrations
│
├── preload/
│   └── index.ts              contextBridge — exposes window.api to renderer
│
├── shared/
│   └── types.ts              Shared TypeScript interfaces + constants
│
└── renderer/src/
    ├── pages/
    │   ├── Dashboard.tsx     Launch panel, running status, optimization
    │   ├── Browse.tsx        Mod search + ModDetailPanel
    │   ├── Library.tsx       Installed mods, categories, modpack import
    │   ├── Instances.tsx     Instance grid + create modal
    │   ├── Profiles.tsx      Profile presets + custom profiles
    │   ├── Crash.tsx         Crash log paste + analysis display
    │   └── Settings.tsx      General / Launch / Account / About tabs
    ├── components/
    │   ├── auth/             AuthModal (Microsoft + Offline)
    │   ├── instances/        InstanceCard, InstanceSettings, LoaderReplaceModal
    │   ├── layout/           Layout, Sidebar, TitleBar
    │   ├── launch/           GameConsole
    │   └── mods/             ModCard, ModDetailPanel, DependencyGraph,
    │                         DepsPrompt, ModpackImportModal
    ├── store/index.ts        Zustand global store
    ├── hooks/useElectron.ts  IPC hooks (loaders, listeners)
    └── icons/index.tsx       SVG icon components (no emoji)
```

---

## License

MIT — ModVault is open source.
