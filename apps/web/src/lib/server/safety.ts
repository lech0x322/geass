import "server-only";
import { heliusRpc } from "./helius";
import { cached } from "./cache";

// Pump.fun's global mint authority PDA. Bonding-curve tokens have their
// mint authority set to this address; once they "graduate" to Raydium it's
// usually set to null (revoked). We treat this address as a soft-warning,
// not a hard red flag, because it's the standard pump.fun setup.
const PUMP_FUN_AUTHORITIES = new Set<string>([
  "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM", // pump.fun mint authority PDA (seen in the wild)
  "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf",
]);

export interface MintSafety {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: string;
  decimals: number;
  isInitialized: boolean;
}

interface ParsedMintAccountInfo {
  value: {
    data: {
      parsed: {
        type: string;
        info: {
          mintAuthority: string | null;
          freezeAuthority: string | null;
          supply: string;
          decimals: number;
          isInitialized: boolean;
        };
      };
      program: string;
    } | null;
  } | null;
}

async function tokenSafetyUncached(mint: string): Promise<MintSafety | null> {
  try {
    const res = await heliusRpc<ParsedMintAccountInfo>("getAccountInfo", [
      mint,
      { encoding: "jsonParsed" },
    ]);
    const parsed = res?.value?.data?.parsed;
    if (!parsed || parsed.type !== "mint") return null;
    const info = parsed.info;
    return {
      mintAuthority: info.mintAuthority,
      freezeAuthority: info.freezeAuthority,
      supply: info.supply,
      decimals: info.decimals,
      isInitialized: info.isInitialized,
    };
  } catch {
    return null;
  }
}

// 60s TTL: mint authorities very rarely change after the initial setup.
export function tokenSafety(mint: string): Promise<MintSafety | null> {
  return cached(`helius:safety:${mint}`, 60_000, () => tokenSafetyUncached(mint));
}

export interface SafetyAnalysis {
  mintRevoked: boolean;
  freezeRevoked: boolean;
  onBondingCurve: boolean;
  flags: string[];
}

export function analyzeSafety(safety: MintSafety | null): SafetyAnalysis {
  if (!safety) {
    return {
      mintRevoked: false,
      freezeRevoked: false,
      onBondingCurve: false,
      flags: ["Could not verify mint"],
    };
  }
  const flags: string[] = [];
  const mintAuth = safety.mintAuthority;
  const freezeAuth = safety.freezeAuthority;
  const onBondingCurve = mintAuth !== null && PUMP_FUN_AUTHORITIES.has(mintAuth);
  const mintRevoked = mintAuth === null;
  const freezeRevoked = freezeAuth === null;

  if (!mintRevoked && !onBondingCurve) flags.push("Mint authority active");
  if (!freezeRevoked) flags.push("Freeze authority active");

  return { mintRevoked, freezeRevoked, onBondingCurve, flags };
}
