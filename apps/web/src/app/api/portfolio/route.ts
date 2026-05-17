import { NextResponse } from "next/server";
import { heliusRpc } from "@/lib/server/helius";
import { enforceRateLimit } from "@/lib/server/withRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenAccount {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  tokenAmount: { uiAmount: number | null; uiAmountString: string };
}

interface DasTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
  token_info?: { balance?: number; decimals?: number; price_per_token?: number; symbol?: string };
}

export interface HoldingRow {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number | null;
  priceUsd: number | null;
}

export interface PortfolioResult {
  sol: number;
  solUsd: number | null;
  holdings: HoldingRow[];
  totalUsd: number | null;
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "portfolio", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  try {
    // Fetch SOL balance + token accounts in parallel
    const [solLamports, dasResult] = await Promise.all([
      heliusRpc<number>("getBalance", [wallet, { commitment: "confirmed" }]),
      heliusRpc<{ token_accounts: DasTokenAccount[] }>("getTokenAccountsByOwner", [
        wallet,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]).catch(() => null),
    ]);

    const sol = (solLamports ?? 0) / 1e9;

    // Fallback: use standard getTokenAccountsByOwner if DAS fails
    let holdings: HoldingRow[] = [];

    if (dasResult?.token_accounts) {
      holdings = dasResult.token_accounts
        .filter(t => (t.amount ?? 0) > 0)
        .map(t => {
          const decimals = t.token_info?.decimals ?? t.decimals ?? 0;
          const uiAmount = t.amount / Math.pow(10, decimals);
          const price = t.token_info?.price_per_token ?? null;
          return {
            mint: t.mint,
            symbol: t.token_info?.symbol ?? t.mint.slice(0, 6).toUpperCase(),
            amount: uiAmount,
            decimals,
            priceUsd: price,
            usdValue: price !== null ? uiAmount * price : null,
          };
        })
        .filter(h => h.amount > 0)
        .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
        .slice(0, 30);
    } else {
      // Plain RPC fallback — no price data
      const accounts = await heliusRpc<{ value: Array<{ account: { data: { parsed: { info: TokenAccount } } } }> }>(
        "getTokenAccountsByOwner",
        [
          wallet,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" },
        ],
      );
      holdings = (accounts?.value ?? [])
        .map(v => {
          const info = v.account.data.parsed.info;
          const ui = info.tokenAmount.uiAmount ?? 0;
          return {
            mint: info.mint,
            symbol: info.mint.slice(0, 6).toUpperCase(),
            amount: ui,
            decimals: info.decimals,
            priceUsd: null,
            usdValue: null,
          };
        })
        .filter(h => h.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 30);
    }

    const knownUsd = holdings.filter(h => h.usdValue !== null).reduce((s, h) => s + h.usdValue!, 0);
    const hasUsd = holdings.some(h => h.usdValue !== null);

    return NextResponse.json({
      sol,
      solUsd: null, // would need SOL/USD price feed
      holdings,
      totalUsd: hasUsd ? knownUsd : null,
    } satisfies PortfolioResult);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
