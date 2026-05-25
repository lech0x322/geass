import "server-only";
import { HELIUS_KEY, HELIUS_API, PRO_TREASURY_WALLET } from "../env";
import { KOL_WALLETS } from "./kol";

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
      transactionTypes: ["TRANSFER", "SWAP"],
      webhookType: "enhanced",
      authHeader: opts.authHeader,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) throw new Error(`create webhook ${r.status}: ${await r.text()}`);
  return r.json();
}

// Lazy idempotent registration for the Pro treasury webhook.
let proRegistrationPromise: Promise<void> | null = null;

export function ensureProWebhook(baseUrl: string | undefined, authHeader: string | undefined): Promise<void> {
  if (proRegistrationPromise) return proRegistrationPromise;
  if (!baseUrl || !PRO_TREASURY_WALLET || !HELIUS_KEY) {
    proRegistrationPromise = Promise.resolve();
    return proRegistrationPromise;
  }
  const url = `${baseUrl.replace(/\/$/, "")}/api/pro/webhook`;
  proRegistrationPromise = (async () => {
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
      proRegistrationPromise = null;
      console.warn("[pro] webhook registration failed:", e instanceof Error ? e.message : e);
    }
  })();
  return proRegistrationPromise;
}

// Lazy idempotent registration for the KOL feed webhook.
let kolRegistrationPromise: Promise<void> | null = null;

export function ensureKolWebhook(baseUrl: string | undefined, authHeader: string | undefined): Promise<void> {
  if (kolRegistrationPromise) return kolRegistrationPromise;
  if (!baseUrl || !HELIUS_KEY) {
    kolRegistrationPromise = Promise.resolve();
    return kolRegistrationPromise;
  }
  const url = `${baseUrl.replace(/\/$/, "")}/api/feed/webhook`;
  const kolAddrs = [...KOL_WALLETS.keys()];
  kolRegistrationPromise = (async () => {
    try {
      const existing = await listWebhooks();
      const match = existing.find(w =>
        w.webhookURL === url && kolAddrs.every(a => w.accountAddresses?.includes(a)),
      );
      if (match) return;
      await createWebhook({ webhookURL: url, accountAddresses: kolAddrs, authHeader });
      console.log("[kol] registered Helius webhook ->", url);
    } catch (e) {
      kolRegistrationPromise = null;
      console.warn("[kol] webhook registration failed:", e instanceof Error ? e.message : e);
    }
  })();
  return kolRegistrationPromise;
}
