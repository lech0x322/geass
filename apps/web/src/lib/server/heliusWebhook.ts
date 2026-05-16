import "server-only";
import { HELIUS_KEY, HELIUS_API, PRO_TREASURY_WALLET } from "../env";

export interface HeliusWebhook {
  webhookID: string;
  webhookURL: string;
  accountAddresses: string[];
  transactionTypes: string[];
  webhookType?: string;
}

export async function listWebhooks(): Promise<HeliusWebhook[]> {
  if (!HELIUS_KEY) return [];
  const r = await fetch(`${HELIUS_API}/webhooks?api-key=${HELIUS_KEY}`, {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`list webhooks ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export async function createWebhook(opts: {
  webhookURL: string;
  accountAddresses: string[];
  authHeader?: string;
}): Promise<HeliusWebhook> {
  const r = await fetch(`${HELIUS_API}/webhooks?api-key=${HELIUS_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhookURL: opts.webhookURL,
      accountAddresses: opts.accountAddresses,
      transactionTypes: ["TRANSFER"],
      webhookType: "enhanced",
      authHeader: opts.authHeader,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) throw new Error(`create webhook ${r.status}: ${await r.text()}`);
  return r.json();
}

// Lazy idempotent registration. Runs at most once per process (then caches the
// result). Safe to call from request handlers — failure is non-fatal.
let registrationPromise: Promise<void> | null = null;

export function ensureProWebhook(baseUrl: string | undefined, authHeader: string | undefined): Promise<void> {
  if (registrationPromise) return registrationPromise;
  if (!baseUrl || !PRO_TREASURY_WALLET || !HELIUS_KEY) {
    registrationPromise = Promise.resolve();
    return registrationPromise;
  }
  const url = `${baseUrl.replace(/\/$/, "")}/api/pro/webhook`;
  registrationPromise = (async () => {
    try {
      const existing = await listWebhooks();
      const match = existing.find(w =>
        w.webhookURL === url && w.accountAddresses?.includes(PRO_TREASURY_WALLET),
      );
      if (match) return;
      await createWebhook({
        webhookURL: url,
        accountAddresses: [PRO_TREASURY_WALLET],
        authHeader,
      });
      console.log("[pro] registered Helius webhook ->", url);
    } catch (e) {
      // Reset so a later call can retry (e.g. transient Helius outage).
      registrationPromise = null;
      console.warn("[pro] webhook registration failed:", e instanceof Error ? e.message : e);
    }
  })();
  return registrationPromise;
}
