import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'sun' | 'check' | 'check-square' | 'calendar' | 'folder' | 'flame' | 'timer'
  | 'chart' | 'settings' | 'plus' | 'search' | 'bell' | 'chevron-right'
  | 'chevron-down' | 'menu' | 'x' | 'trash' | 'edit' | 'alert' | 'clock'
  | 'arrow-right' | 'refresh' | 'log-out' | 'more' | 'list' | 'filter'
  | 'shield' | 'sparkle' | 'inbox' | 'archive' | 'pause' | 'play'

const paths: Record<IconName, ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  'check-square': <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10H3z"/>,
  flame: <path d="M12 22c4.5 0 7-3.2 7-7 0-4-3-6-4-9-.4 2-2 3-2 3S12 5 9 2C9 8 5 10 5 15a7 7 0 0 0 7 7Z"/>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6m3 3 2-2"/></>,
  chart: <><path d="M4 20V11m6 9V4m6 16v-8m4 8V8"/></>,
  settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.9 2.9-.1-.1a1.7 1.7 0 0 0-1.8-.3l-.2.1V22h-4v-2.5l-.2-.1a1.7 1.7 0 0 0-1.8.3l-.1.1-2.9-2.9.1-.1a1.7 1.7 0 0 0 .3-1.8l-.1-.2H3v-4h2.5l.1-.2a1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.9-2.9.1.1a1.7 1.7 0 0 0 1.8.3l.2-.1V3h4v2.5l.2.1a1.7 1.7 0 0 0 1.8-.3l.1-.1 2.9 2.9-.1.1a1.7 1.7 0 0 0-.3 1.8l.1.2H22v4h-2.5z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  'chevron-right': <path d="m9 18 6-6-6-6"/>,
  'chevron-down': <path d="m6 9 6 6 6-6"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  x: <path d="M5 5 19 19M19 5 5 19"/>,
  trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/></>,
  edit: <><path d="M4 20h4l12-12-4-4L4 16zM14 6l4 4"/></>,
  alert: <><path d="M12 3 2 21h20z"/><path d="M12 9v5m0 3v.1"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  'arrow-right': <path d="M4 12h16m-7-7 7 7-7 7"/>,
  refresh: <><path d="M20 7V3l-3 3a9 9 0 1 0 3 9M20 3v5h-5"/></>,
  'log-out': <><path d="M10 4H4v16h6M14 8l4 4-4 4m-7-4h11"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  shield: <><path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5z"/><path d="m9 12 2 2 4-5"/></>,
  sparkle: <path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1z"/>,
  inbox: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v12h14V9M10 13h4"/></>,
  pause: <path d="M8 5v14m8-14v14"/>,
  play: <path d="m8 5 11 7-11 7z"/>,
}

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number }

export default function Icon({ name, size = 18, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {paths[name]}
    </svg>
  )
}
