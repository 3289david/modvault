import React from 'react'

type IconProps = { size?: number; className?: string }

const icon =
  (path: React.ReactNode, viewBox = '0 0 24 24') =>
  ({ size = 16, className = '' }: IconProps) =>
    (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    )

export const HomeIcon = icon(
  <>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </>
)

export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>
)

export const PackageIcon = icon(
  <>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </>
)

export const LayersIcon = icon(
  <>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </>
)

export const TerminalIcon = icon(
  <>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </>
)

export const SettingsIcon = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </>
)

export const DownloadIcon = icon(
  <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>
)

export const TrashIcon = icon(
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </>
)

export const FolderIcon = icon(
  <>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </>
)

export const PlusIcon = icon(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>
)

export const XIcon = icon(
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>
)

export const CheckIcon = icon(
  <polyline points="20 6 9 17 4 12" />
)

export const AlertTriangleIcon = icon(
  <>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
)

export const AlertCircleIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>
)

export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>
)

export const ChevronDownIcon = icon(
  <polyline points="6 9 12 15 18 9" />
)

export const ChevronRightIcon = icon(
  <polyline points="9 18 15 12 9 6" />
)

export const ExternalLinkIcon = icon(
  <>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>
)

export const RefreshIcon = icon(
  <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </>
)

export const StarIcon = icon(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
)

export const ZapIcon = icon(
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
)

export const ShieldIcon = icon(
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
)

export const GridIcon = icon(
  <>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </>
)

export const ListIcon = icon(
  <>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </>
)

export const CpuIcon = icon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </>
)

export const UploadIcon = icon(
  <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
)

export const GitBranchIcon = icon(
  <>
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 01-9 9" />
  </>
)

export const BoxIcon = icon(
  <>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
  </>
)

export const MinimizeIcon = icon(
  <line x1="5" y1="12" x2="19" y2="12" />
)

export const MaximizeIcon = icon(
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
)

export const CloseWinIcon = icon(
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>
)

export const SparklesIcon = icon(
  <>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M5 19l.75 2.25L8 22l-2.25.75L5 25l-.75-2.25L2 22l2.25-.75L5 19z" />
    <path d="M19 2l.5 1.5L21 4l-1.5.5L19 6l-.5-1.5L17 4l1.5-.5L19 2z" />
  </>
)

export const PlayIcon = icon(
  <polygon points="5 3 19 12 5 21 5 3" />
)

export const LinkIcon = icon(
  <>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </>
)

export const FilterIcon = icon(
  <>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </>
)

export const ToggleLeftIcon = icon(
  <>
    <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
    <circle cx="8" cy="12" r="3" />
  </>
)

export const ToggleRightIcon = icon(
  <>
    <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
    <circle cx="16" cy="12" r="3" />
  </>
)

export const LoaderSpinIcon = ({
  size = 16,
  className = ''
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={`animate-spin ${className}`}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
)

// Loader-specific brand icons
export const FabricLoaderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#60a5fa" strokeWidth={1.5} />
    <path d="M2 7l10 5 10-5" stroke="#60a5fa" strokeWidth={1.5} />
    <path d="M12 12v10" stroke="#60a5fa" strokeWidth={1.5} />
    <path d="M7 4.5l5 2.5 5-2.5" stroke="#93c5fd" strokeWidth={1} />
  </svg>
)

export const ForgeLoaderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 20h16M8 20V9l4-7 4 7v11" stroke="#f97316" strokeWidth={1.5} strokeLinecap="round" />
    <rect x="9" y="13" width="6" height="4" rx="1" stroke="#fb923c" strokeWidth={1.25} />
    <path d="M11 13v-2h2v2" stroke="#fb923c" strokeWidth={1} />
  </svg>
)

export const NeoForgeLoaderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 20h16M8 20V9l4-7 4 7v11" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" />
    <rect x="9" y="13" width="6" height="4" rx="1" stroke="#fbbf24" strokeWidth={1.25} />
    <path d="M10 11l2-2 2 2" stroke="#fbbf24" strokeWidth={1} strokeLinecap="round" />
  </svg>
)

export const QuiltLoaderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="#a78bfa" strokeWidth={1.5} />
    <rect x="13" y="3" width="8" height="8" rx="1" stroke="#c4b5fd" strokeWidth={1.5} />
    <rect x="3" y="13" width="8" height="8" rx="1" stroke="#c4b5fd" strokeWidth={1.5} />
    <rect x="13" y="13" width="8" height="8" rx="1" stroke="#a78bfa" strokeWidth={1.5} />
    <line x1="3" y1="7" x2="21" y2="7" stroke="#7c3aed" strokeWidth={0.75} />
    <line x1="7" y1="3" x2="7" y2="21" stroke="#7c3aed" strokeWidth={0.75} />
  </svg>
)

// ModVault brand logo
export const ModVaultLogo = ({ size = 24, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <path
      d="M16 2L4 8v8c0 7 6 12 12 14 6-2 12-7 12-14V8L16 2z"
      fill="url(#logo-grad)"
      opacity="0.9"
    />
    <path
      d="M16 2L4 8v8c0 7 6 12 12 14 6-2 12-7 12-14V8L16 2z"
      stroke="#7c3aed"
      strokeWidth="1"
      fill="none"
    />
    <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 7v4M13 8.5l2.5 2.5M19 8.5l-2.5 2.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

export const ModrinthIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 110 16A8 8 0 0112 4zm0 2a6 6 0 100 12A6 6 0 0012 6zm0 2a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
)

export const CurseForgeIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.97 2L5 8.5 7.5 11 5 13.5 8 16l-3 6h4l2-4 3 4h4l-3-6 3-2.5L13 11l2.5-2.5L11.97 2z" />
  </svg>
)

export const UserIcon = icon(
  <>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
)

export const MicrosoftIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="2" y="2" width="9.5" height="9.5" fill="#f25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900" />
  </svg>
)

export const StopIcon = icon(
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
)

export const RocketIcon = icon(
  <>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </>
)

export const JavaIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.85 16.83c-.45.24-.7.63-.7 1.07 0 .97 1.38 1.79 3.85 1.79 2.47 0 3.85-.82 3.85-1.79 0-.44-.25-.83-.7-1.07-.83.34-1.9.54-3.15.54-1.25 0-2.32-.2-3.15-.54zm4.15-8.09c-3.31 0-5.5 1.24-5.5 2.76s2.19 2.76 5.5 2.76 5.5-1.24 5.5-2.76-2.19-2.76-5.5-2.76zM8.5 4.5c0-1 1-1.8 2.5-2.1C9 2.8 7.5 4 7.5 5.5c0 .9.7 1.7 1.8 2.3C8.8 7 8.5 5.8 8.5 4.5zm7 0c0 1.3-.3 2.5-.8 3.3 1.1-.6 1.8-1.4 1.8-2.3 0-1.5-1.5-2.7-3.5-3.1 1.5.3 2.5 1.1 2.5 2.1z" />
  </svg>
)
