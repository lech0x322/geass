---
name: geass-patterns
description: Coding patterns extracted from the GEASS Solana Alpha Intelligence monorepo
version: 1.0.0
source: local-git-analysis
analyzed_commits: 60
---

# GEASS Patterns

## Commit Conventions

All commits use **conventional commits** with optional scopes:

```
feat(scope): description
fix(scope): description
chore: description
refactor(scope): description
revert: description
```

Common scopes: `auth`, `wallet`, `ipfs`, `launch`, `ui`, `pro`, `infra`, `safety`, `stream`, `client`

Use em dash (—) for extended context in descriptions: `fix(auth): short reason — detail`

## Code Architecture

```
apps/web/src/
├── app/
│   ├── api/            # Next.js API routes (one folder per domain)
│   │   ├── auth/       # nonce, session, verify
│   │   ├── jito/       # snipe, submit
│   │   ├── pump/       # ipfs, sign-server, autosnipe, launch-bundle
│   │   ├── dex/        # search, token/[address], trending
│   │   ├── helius/     # parse, history/[address]
│   │   └── webhook/    # helius
│   └── globals.css
├── components/         # React components (PascalCase.tsx)
│   ├── App.tsx         # Main app shell — most-changed file
│   ├── GemCard.tsx     # Token card component
│   ├── LandingPage.tsx # Auth gate / landing
│   ├── SnipeModal.tsx  # Trade/snipe UI modal
│   ├── TokenModal.tsx  # DEX detail modal
│   ├── InternalWalletPanel.tsx
│   └── icons.tsx       # SVG icon components (no emoji)
├── lib/
│   ├── api.ts          # Client-side fetch wrappers
│   ├── auth.ts         # useAuth hook — session state
│   ├── config.ts       # NAV array, KOLS, TIER, client-safe constants
│   ├── env.ts          # Env var accessors (server + client)
│   ├── wallet.ts       # Phantom connect + SIWS sign-in
│   ├── pro.ts          # Pro tier logic
│   ├── types.ts        # Shared TypeScript types
│   ├── pumpportal.ts   # PumpPortal browser-side service
│   ├── useKolFeed.ts   # SSE KOL feed hook
│   └── server/         # Server-only modules (never imported client-side)
│       ├── redis.ts
│       ├── siws.ts
│       ├── jitoService.ts
│       ├── kolFeed.ts / kolParser.ts
│       ├── helius.ts / heliusWebhook.ts / heliusWs.ts
│       ├── scanner.ts / enrich.ts / safety.ts
│       ├── smartWallets.ts
│       ├── dexscreener.ts
│       ├── referral.ts / pumpTrade.ts
│       ├── withRateLimit.ts / rateLimit.ts
│       └── bondingCurve.ts / cache.ts
└── types/
    └── helius.ts       # External API type definitions
packages/
└── sdk/                # Internal SDK (Jito bundle helpers)
    └── src/jito/
```

## Key Workflows

### Adding a New API Feature
1. Create `apps/web/src/app/api/<domain>/route.ts` with `export const runtime = "nodejs"`
2. Add fetch wrapper in `apps/web/src/lib/api.ts`
3. Wire UI in `apps/web/src/components/App.tsx`
4. Add env vars to `apps/web/src/lib/env.ts`

### Adding a New Nav Tab
1. Add entry to `NAV` array in `apps/web/src/lib/config.ts` — set `id`, `label`, `mobileLabel`, `iconId`, `mobile`
2. Add `{tab === "id" && (...)}` block in `App.tsx`
3. Add tab id to the union type in `App.tsx` useState

### Auth / SIWS Flow
- Nonce: `GET /api/auth/nonce` → stored in Redis with 5min TTL
- Sign: Phantom `signIn()` (native SIWS) or `signMessage` fallback
- Verify: `POST /api/auth/verify` → issues HttpOnly JWT cookie (`geass_session`, 7d)
- `issuedAt` must be ISO 8601 **without milliseconds**: `new Date().toISOString().replace(/\.\d{3}Z$/, "Z")`

### Server-Only Code
- All files under `lib/server/` are Node.js only — never import in components or client libs
- API routes use `export const runtime = "nodejs"` when using Node APIs (crypto, Redis, etc.)

## Design Conventions

- **No emoji in UI** — use SVG icon components from `icons.tsx`
- Inline styles with `style={{...}}` throughout (no CSS modules or Tailwind)
- Color palette: `#0c0c0e` bg, `#18181b` border, `#ef4444` red accent, `#10b981` green, `#a855f7` pro purple
- Mobile bottom nav uses `mobileLabel` (shorter); sidebar uses `label`
- `sidebarCollapsed` state hides labels, shows only icons at `size={16}`

## External Services

| Service | Purpose | Location |
|---------|---------|----------|
| Helius | Solana RPC + webhooks | `lib/server/helius.ts` — use `api-mainnet.helius-rpc.com` |
| Jito | MEV-protected bundles | `packages/sdk/src/jito/`, `lib/server/jitoService.ts` |
| pump.fun | Token launch + IPFS | `app/api/pump/` |
| PumpPortal | Browser-side trading | `lib/pumpportal.ts` — IP-blocked on cloud, browser-only |
| DEX Screener | Token prices + trending | `lib/server/dexscreener.ts` |
| Upstash Redis | Nonces, KOL feed, smart wallets | `lib/server/redis.ts` |

## IP-Block Gotchas

- **PumpPortal trade-local** is IP-blocked on cloud servers → call from browser only
- **pump.fun IPFS** → server proxy via `app/api/pump/ipfs/route.ts`
- **Helius Enhanced Transactions** → `api-mainnet.helius-rpc.com` not the standard RPC URL
