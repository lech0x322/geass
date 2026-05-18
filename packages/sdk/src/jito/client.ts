import { type JitoBundle, type BundleSubmitResult, type BundleStatus } from "./bundle";
import { fetchTipAccounts, JITO_TIP_ACCOUNTS } from "./tip";

/** Regional Jito Block Engine endpoints — pick the closest for lower latency. */
export const JITO_ENDPOINTS = {
  mainnet:   "https://mainnet.block-engine.jito.wtf",
  ny:        "https://ny.mainnet.block-engine.jito.wtf",
  amsterdam: "https://amsterdam.mainnet.block-engine.jito.wtf",
  frankfurt: "https://frankfurt.mainnet.block-engine.jito.wtf",
  tokyo:     "https://tokyo.mainnet.block-engine.jito.wtf",
  slc:       "https://slc.mainnet.block-engine.jito.wtf",
} as const;

export type JitoRegion = keyof typeof JITO_ENDPOINTS;

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

/**
 * JitoClient — thin wrapper around the Jito Block Engine REST/JSON-RPC API.
 * No gRPC, fully compatible with Next.js serverless / Vercel Edge.
 *
 * @example
 * const client = new JitoClient();
 * const { bundleId } = await client.sendBundle(bundle);
 */
export class JitoClient {
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(
    blockEngineUrl: string = JITO_ENDPOINTS.mainnet,
    timeoutMs = 20_000,
  ) {
    this.url = blockEngineUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  private async rpc<T>(method: string, params: unknown): Promise<T> {
    const res = await fetch(`${this.url}/api/v1/bundles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jito ${method} HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json() as JsonRpcResponse<T>;
    if (json.error) {
      throw new Error(`Jito ${method} RPC error ${json.error.code}: ${json.error.message}`);
    }
    if (json.result === undefined) {
      throw new Error(`Jito ${method}: empty result`);
    }
    return json.result;
  }

  /**
   * Submit a JitoBundle. Returns the bundle UUID on success.
   * The bundle must contain 1–5 fully-signed transactions; the last tx should
   * include a SystemProgram.transfer tip to a Jito tip account.
   */
  async sendBundle(bundle: JitoBundle): Promise<BundleSubmitResult> {
    if (bundle.size === 0) throw new Error("JitoClient: cannot send empty bundle");
    const bundleId = await this.rpc<string>("sendBundle", bundle.toRpcParams());
    return { bundleId };
  }

  /**
   * Submit raw base58-encoded transactions without a JitoBundle wrapper.
   * Use this when you already have serialized signed transactions.
   */
  async sendRaw(base58Txs: string[]): Promise<BundleSubmitResult> {
    if (!base58Txs.length) throw new Error("JitoClient: no transactions provided");
    const bundleId = await this.rpc<string>("sendBundle", [base58Txs]);
    return { bundleId };
  }

  /** Check the landing status of a previously submitted bundle. */
  async getBundleStatus(bundleId: string): Promise<BundleStatus> {
    type StatusResponse = {
      context: { slot: number };
      value: Array<{
        bundle_id: string;
        transactions: string[];
        slot: number;
        confirmation_status: string;
        err: { Ok: null } | { Err: unknown };
      }> | null;
    };

    const result = await this.rpc<StatusResponse>("getBundleStatuses", [[bundleId]]);
    const entry = result.value?.[0];

    if (!entry) return { bundleId, status: "Unknown" };

    const confStatus = entry.confirmation_status?.toLowerCase() ?? "";
    let status: BundleStatus["status"] = "Pending";
    if (confStatus === "confirmed" || confStatus === "finalized") status = "Landed";
    else if ("Err" in entry.err)                                   status = "Failed";

    return { bundleId, status, slot: entry.slot };
  }

  /** Fetch the current list of valid Jito tip accounts. Falls back to hardcoded list. */
  async getTipAccounts(): Promise<string[]> {
    return fetchTipAccounts(this.url);
  }

  /** Returns true if the block engine is reachable. */
  async healthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/v1/bundles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getInflightBundleStatuses", params: [[]] }),
        signal: AbortSignal.timeout(4_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Convenience: create a client for a named region. */
  static forRegion(region: JitoRegion, timeoutMs?: number): JitoClient {
    return new JitoClient(JITO_ENDPOINTS[region], timeoutMs);
  }
}

export { JITO_TIP_ACCOUNTS };
