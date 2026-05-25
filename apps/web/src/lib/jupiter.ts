export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const LAMPORTS = 1_000_000_000;

export interface JupQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: unknown[];
  slippageBps: number;
  otherAmountThreshold: string;
  [key: string]: unknown;
}

export interface LimitParams {
  inputMint: string;
  outputMint: string;
  maker: string;
  payer: string;
  makingAmount: string;
  takingAmount: string;
  expiredAt?: string;
}

export interface DcaParams {
  payer: string;
  user: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  inAmountPerCycle: string;
  cycleSecondsApart: number;
  minOutAmount?: string;
  maxOutAmount?: string;
}

export async function jupQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps = 50,
): Promise<JupQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amount),
    slippageBps: String(slippageBps),
  });
  const res = await fetch(`/api/jupiter/quote?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Quote failed");
  }
  return res.json();
}

export async function jupSwapTx(
  quote: JupQuote,
  userPubkey: string,
): Promise<{ swapTransaction: string }> {
  const res = await fetch("/api/jupiter/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: userPubkey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Swap tx failed");
  }
  return res.json();
}

export async function jupPrice(mints: string[]): Promise<Record<string, number | null>> {
  const res = await fetch(`/api/jupiter/price?ids=${mints.join(",")}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Price fetch failed");
  }
  const { data } = await res.json() as { data: Record<string, { price: number } | null> };
  return Object.fromEntries(
    mints.map(m => [m, data[m]?.price ?? null]),
  );
}

export async function jupLimitOrder(params: LimitParams): Promise<{ order: string; tx: string }> {
  const res = await fetch("/api/jupiter/limit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Limit order failed");
  }
  return res.json();
}

export async function jupDca(params: DcaParams): Promise<{ dcaKey: string; tx: string }> {
  const res = await fetch("/api/jupiter/dca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "DCA creation failed");
  }
  return res.json();
}
