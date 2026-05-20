export const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";
export const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
export const HELIUS_API = `https://api-mainnet.helius-rpc.com/v0`;
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

export const PUMP_PROG = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const WSOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SKIP_MINTS = new Set<string>([WSOL, USDC]);

export const SCAN_LIMIT = 12;
export const SCORE_MIN_HELIUS = 50;
export const SCORE_MIN_DEX = 45;

// GEASS Pro subscription
export const PRO_TREASURY_WALLET = process.env.PRO_TREASURY_WALLET ?? "";
export const PRO_PRICE_SOL = Number(process.env.PRO_PRICE_SOL ?? "3");
export const PRO_DURATION_DAYS = Number(process.env.PRO_DURATION_DAYS ?? "30");
export const PRO_DURATION_MS = PRO_DURATION_DAYS * 24 * 60 * 60 * 1000;

// Helius webhooks
export const HELIUS_WEBHOOK_AUTH = process.env.HELIUS_WEBHOOK_AUTH ?? "";
export const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL ?? "";

// PumpPortal server-side trading
export const PUMPPORTAL_API_KEY = process.env.PUMPPORTAL_API_KEY ?? "";
export const GEASS_WALLET_PUBKEY = process.env.GEASS_WALLET_PUBKEY ?? "";
export const GEASS_WALLET_PRIVKEY = process.env.GEASS_WALLET_PRIVKEY ?? "";
export const SOLANA_RPC = process.env.SOLANA_RPC ?? HELIUS_RPC;

// Jito Block Engine
export const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL
  ?? "https://mainnet.block-engine.jito.wtf";
