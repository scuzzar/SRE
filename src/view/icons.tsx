import type { ReactNode } from 'react';

// Icons aus dem UI-Entwurf, als Komponenten.

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;

export function DiceIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function CardIcon() {
  return (
    <svg {...base} strokeLinejoin="round">
      <rect x="6" y="3" width="13" height="17" rx="1.5" />
      <path d="M4 7v12.5A1.5 1.5 0 0 0 5.5 21H15" />
    </svg>
  );
}

export function OracleIcon() {
  return (
    <svg {...base} width={22} height={22} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg {...base} width={22} height={22} strokeLinecap="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...base} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base} width={30} height={30} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const senses: Record<string, { label: string; path: ReactNode }> = {
  hear: {
    label: 'Hören',
    path: (
      <>
        <path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6" />
        <path d="M10 9a2 2 0 0 1 4 0" />
      </>
    ),
  },
  see: {
    label: 'Sehen',
    path: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
  feel: {
    label: 'Fühlen',
    path: (
      <>
        <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
        <path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6" />
        <path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4 15.5a1.5 1.5 0 0 1 2.3-1.9L8 15.5" />
      </>
    ),
  },
  smell: {
    label: 'Riechen',
    path: (
      <>
        <path d="M12 3c-1 4-4 9-4 12a4 4 0 0 0 8 0" />
        <path d="M9 17.5c-1.5.5-3 .2-3-1.2" />
        <path d="M15 17.5c1.5.5 3 .2 3-1.2" />
      </>
    ),
  },
};

/** Icon für einen Sinn; `sense` ist der letzte Teil der Feld-Id (hear, see, feel, smell). */
export function SenseIcon({ sense }: { sense: string }) {
  const icon = senses[sense];
  if (!icon) return null;
  return (
    <svg {...base} width={18} height={18} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={icon.label} aria-hidden={undefined}>
      {icon.path}
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function ShrinkIcon() {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg {...base} width={16} height={16} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}
