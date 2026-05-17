import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/withRateLimit";
import { buildLaunchTxsForPhantom, jitoLaunchServer } from "@/lib/server/jitoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_UA = "Mozilla/5.0 (compatible; GEASS/1.0; +https://geass.app)";

async function uploadIpfs(form: FormData): Promise<string> {
  const res = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: form,
    headers: { "User-Agent": FETCH_UA },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`IPFS upload ${res.status}: ${t.slice(0, 200)}`);
  }
  const { metadataUri } = await res.json() as { metadataUri: string };
  return metadataUri;
}

/**
 * POST (multipart/form-data)
 * Fields: name, symbol, description, devBuySol, tipSol, [file | imageUrl]
 * Optional: wallet (pubkey) → if provided, returns unsigned txs for Phantom to sign
 *           server=true    → use GEASS server wallet, sign + submit automatically
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { bucket: "launch-bundle", max: 5, windowMs: 120_000 });
  if (limited) return limited;

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const name       = form.get("name")?.toString().trim() ?? "";
  const symbol     = form.get("symbol")?.toString().trim().toUpperCase() ?? "";
  const description = form.get("description")?.toString().trim() ?? name;
  const devBuySol  = parseFloat(form.get("devBuySol")?.toString() ?? "0.5");
  const tipSol     = parseFloat(form.get("tipSol")?.toString() ?? "0.003");
  const wallet     = form.get("wallet")?.toString().trim() ?? "";
  const serverMode = form.get("server")?.toString() === "true";

  if (!name || !symbol) {
    return NextResponse.json({ error: "name and symbol are required" }, { status: 400 });
  }
  if (!Number.isFinite(devBuySol) || devBuySol < 0) {
    return NextResponse.json({ error: "Invalid devBuySol" }, { status: 400 });
  }

  // Upload metadata to IPFS
  const ipfsForm = new FormData();
  ipfsForm.append("name", name);
  ipfsForm.append("symbol", symbol);
  ipfsForm.append("description", description);
  ipfsForm.append("showName", "true");
  const file = form.get("file");
  if (file instanceof Blob && file.size > 0) ipfsForm.append("file", file, "image.png");

  let metadataUri: string;
  try {
    metadataUri = await uploadIpfs(ipfsForm);
  } catch (e) {
    return NextResponse.json(
      { error: `IPFS: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  try {
    if (serverMode) {
      // GEASS wallet signs everything and submits
      const result = await jitoLaunchServer({
        metadataUri,
        tokenName:   name,
        tokenSymbol: symbol,
        devBuySol,
        tipSol,
      });
      return NextResponse.json({ ...result, metadataUri, mode: "server" });
    }

    if (!wallet) {
      return NextResponse.json({ error: "Provide wallet pubkey or set server=true" }, { status: 400 });
    }

    // Build unsigned txs for Phantom
    const txs = await buildLaunchTxsForPhantom({
      walletPubkey: wallet,
      metadataUri,
      tokenName:    name,
      tokenSymbol:  symbol,
      devBuySol,
      tipSol,
    });
    return NextResponse.json({ ...txs, metadataUri, mode: "phantom" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
