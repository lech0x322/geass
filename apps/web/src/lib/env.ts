export const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";
export const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
export const HELIUS_API = `https://api.helius.xyz/v0`;
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

export const PUMP_PROG = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const WSOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SKIP_MINTS = new Set<string>([WSOL, USDC]);

export const SCAN_LIMIT = 12;
export const SCORE_MIN_HELIUS = 50;
export const SCORE_MIN_DEX = 45;
