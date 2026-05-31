"use client";

import type { CSSProperties, ReactNode } from "react";

interface IconProps {
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

const Svg = ({ size = 16, strokeWidth = 1.6, style, className, children }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline-block", flexShrink: 0, ...style }}
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

export const IconScanner = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
    <path d="M11 8v6" />
    <path d="M8 11h6" />
  </Svg>
);

export const IconActivity = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h3l3-8 4 16 3-8h5" />
  </Svg>
);

export const IconRocket = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.84-.85 1-2.4.13-3.27a2 2 0 0 0-3.13.27Z" />
    <path d="M12 15s-2.5-1.5-4-3-3-4-3-4 4.5-1 7 1.5S15 12 15 12Z" />
    <path d="M9 12s2.5 1.5 4 3 3 4 3 4 1-4.5-1.5-7S12 9 12 9Z" />
    <circle cx="15" cy="9" r="1.5" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M6.3 17.7l2.4-2.4M15.3 8.7l2.4-2.4" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconZap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
  </Svg>
);

export const IconCpu = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 14v3M12 9v8M17 5v12" />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
    <path d="M16 13h2" />
    <path d="M18 7V5a1 1 0 0 0-1.3-.95L5 7" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 5 5L20 6" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </Svg>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconHourglass = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12M6 21h12M6 3v3a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3M6 21v-3a6 6 0 0 1 6-6 6 6 0 0 1 6 6v3" />
  </Svg>
);

export const IconBroadcast = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M20.07 4.93a10 10 0 0 1 0 14.14M3.93 19.07a10 10 0 0 1 0-14.14" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconCog = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);

export const IconCrown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z" />
  </Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M17 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const IconFlame = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 3 1 4 2 4 0-3-1-4 1-7 1 2 4 3 4 7a4 4 0 0 1-4 4" />
  </Svg>
);

export const IconSpeaker = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15 9a4 4 0 0 1 0 6" />
    <path d="M19 6a8 8 0 0 1 0 12" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export const IconPower = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    <path d="M12 2v10" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    <path d="M9 21V12h6v9" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </Svg>
);

export const IconSwap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 16H3m0 0 4-4M3 16l4 4" />
    <path d="M17 8h4m0 0-4-4m4 4-4 4" />
  </Svg>
);

export const IconRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
);

/** Solana brand mark — three diagonal gradient bars. */
export const IconSolana = ({ size = 16, style, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 397.7 311.7"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", flexShrink: 0, ...style }}
    className={className}
    aria-hidden
  >
    <defs>
      <linearGradient id="sol-g1" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="sol-g2" x1="264.829" y1="401.601" x2="45.163" y2="-19.148" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="sol-g3" x1="312.548" y1="376.688" x2="92.882" y2="-44.061" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
    <path fill="url(#sol-g1)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7Z" />
    <path fill="url(#sol-g2)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8Z" />
    <path fill="url(#sol-g3)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.6Z" />
  </svg>
);

/** Blue verified checkmark — filled circle with white check (Twitter/X style). */
export const IconVerified = ({ size = 16, style, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", flexShrink: 0, ...style }}
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
    <path d="M9.5 16.5 5.5 12.5l1.41-1.41L9.5 13.67l7.59-7.58L18.5 7.5z" fill="white" />
  </svg>
);

/** Gold shield badge — unique to the platform creator. */
export const IconCreatorBadge = ({ size = 18, style, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", flexShrink: 0, ...style }}
    className={className}
    aria-label="Creator"
  >
    <defs>
      <linearGradient id="gold-g" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#ffe066" />
        <stop offset="55%"  stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    {/* Shield */}
    <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill="url(#gold-g)" />
    {/* Crown */}
    <path d="M7 16h10M7 16l1.5-5 2.5 2.5 1-3.5 1 3.5 2.5-2.5L17 16" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" fill="none" />
    {/* Crown jewel dots */}
    <circle cx="8.5" cy="11" r=".7" fill="#fff" />
    <circle cx="12" cy="9.5" r=".7" fill="#fff" />
    <circle cx="15.5" cy="11" r=".7" fill="#fff" />
  </svg>
);

/** Camera icon for photo upload. */
export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Svg>
);

/** Globe / Social Tracker icon. */
export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M2 12h20" />
    <path d="M12 2a14.5 14.5 0 0 1 0 20A14.5 14.5 0 0 1 12 2Z" />
  </Svg>
);

/** Newspaper / feed icon. */
export const IconNewspaper = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </Svg>
);

/** Eye / watch icon. */
export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

/** Bell / alert icon. */
export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

/** Bot / AI icon. */
export const IconBot = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M9 12h.01M15 12h.01" />
    <path d="M9 16h6" />
    <path d="M12 2v4" />
    <path d="M8 8V6a4 4 0 0 1 8 0v2" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5" />
  </Svg>
);

/** Coin / cashback */
export const IconCoin = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v1m0 8v1m-3.5-5.5c0-1.1.9-2 2-2h3a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h2a1 1 0 0 1 0 2h-3a2 2 0 0 1-2-2" />
  </Svg>
);

/** Trending up arrow. */
export const IconTrendingUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </Svg>
);
