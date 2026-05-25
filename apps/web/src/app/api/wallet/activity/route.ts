import { NextRequest, NextResponse } from "next/server";

const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "missing wallet" }, { status: 400 });
  if (!HELIUS_KEY) return NextResponse.json({ txs: [] });

  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${HELIUS_KEY}&limit=20&type=SWAP,TRANSFER`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return NextResponse.json({ txs: [] });
    const data = await r.json() as HeliusTx[];
    const txs = data.slice(0, 20).map(tx => ({
      sig:       tx.signature,
      ts:        tx.timestamp * 1000,
      type:      tx.type,
      desc:      tx.description ?? "",
      fee:       tx.fee / 1e9,
      source:    tx.source ?? "",
      nativeAmt: (tx.nativeTransfers ?? []).reduce((s, t) => s + (t.fromUserAccount === wallet ? -t.amount : t.toUserAccount === wallet ? t.amount : 0), 0) / 1e9,
    }));
    return NextResponse.json({ txs });
  } catch {
    return NextResponse.json({ txs: [] });
  }
}

interface HeliusTx {
  signature: string;
  timestamp: number;
  type: string;
  description?: string;
  fee: number;
  source?: string;
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
}
