import type { SVGProps } from 'react';

// A small set of inline line icons, drawn on a 24px grid.
const paths = {
  home: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  book: 'M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5V5.5ZM12 6v13.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12l1.8-1-1.5-3-2 .3-1.2-1.2.3-2-3-1.5-1 1.8h-1.7l-1-1.8-3 1.5.3 2-1.2 1.2-2-.3-1.5 3L5 12l-1.8 1 1.5 3 2-.3 1.2 1.2-.3 2 3 1.5 1-1.8h1.7l1 1.8 3-1.5-.3-2 1.2-1.2 2 .3 1.5-3L19 12Z',
  pencil: 'M4 20l1-4L16 5l3 3L8 19l-4 1ZM14 7l3 3',
  shuffle: 'M4 7h3c4 0 6 10 10 10h3M4 17h3c1.5 0 2.7-1.4 3.7-3.2M13.3 10.2C14.3 8.4 15.5 7 17 7h3M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5',
  feather: 'M20 4c-6 0-11 4-12 11l-3 5M8 15h6M10.5 11H17M6 18c6-1 12-5 14-14',
  bookmark: 'M7 4h10v16l-5-4-5 4V4Z',
  bookmarkFilled: 'M7 4h10v16l-5-4-5 4V4Z',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  play: 'M8 5.5v13l10.5-6.5L8 5.5Z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4.5 9A8 8 0 1 1 4 13M4 4v5h5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 6.1c.5-.1.9-.1 1.4-.1 6 0 9.5 6 9.5 6s-1 1.9-2.9 3.6M6.6 6.7C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  download: 'M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  trash: 'M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a1 1 0 0 0 1 .9h9a1 1 0 0 0 1-.9l1-12.5M9 7V4.5h6V7',
  x: 'M6 6l12 12M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  check: 'M5 12.5l4.5 4.5L19 7',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  leaf: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7',
  sparkle: 'M12 3l1.8 5.6L19.5 10l-5.7 1.6L12 17l-1.8-5.4L4.5 10l5.7-1.4L12 3ZM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5a1 1 0 1 0 0-.01',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  simpler: 'M5 12h14M5 7h14M5 17h8',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'bookmarkFilled' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** The small hand-drawn "corner" mark used as the logo. */
export function CornerMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 34V12l10-5v27M16 34V16h14v18M4 34h32" />
      <path d="M20 21h3v4h-3zM25 21h3v4h-3zM20 34v-5h4v5" />
      <path d="M9 15h3M9 20h3M9 25h3" opacity=".7" />
      <path d="M30 16l3-4" stroke="var(--terracotta)" />
    </svg>
  );
}
