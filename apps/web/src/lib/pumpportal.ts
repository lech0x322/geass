"use client";

/**
 * PumpPortal browser-side service.
 *
 * PumpPortal's /api/trade-local endpoint blocks server/cloud IPs — it must be
 * called directly from the user's browser. This module is "use client" only.
 *
 * Adapted for GEASS: uses existing Phantom wallet helpers and Jito submit
 * infrastructure rather than raw Connection.sendRawTransaction.
 */

import { VersionedTransaction } from "@solana/web3.js";
import { signAndSendBytes, signAllWithPhantom } from "./wallet";
import { jitoSubmit } from "./api";

const PUMP_URL = "https://pumpportal.fun/api/trade-local";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TradeParams {
  publicKey:        string;
  action:           "buy" | "sell" | "create";
  mint:             string;
  amount:           number;
  denominatedInSol?: boolean;  // default true — amount is in SOL
  slippage?:        number;    // default 15
  priorityFee?:     number;    // SOL, default 0.0005
  pool?:            "pump" | "auto";
  tokenMetadata?:   { name: string; symbol: string; uri: string };
}

export interface TradeResult {
  success:    true;
  mode:       "phantom" | "jito-phantom" | "jito-server";
  signature?: string;  // for standard phantom path
  bundleId?:  string;  // for Jito paths
}

// ── Core: build unsigned transaction bytes from PumpPortal ───────────────────

/**
 * Call PumpPortal's trade-local from the browser and return raw unsigned
 * transaction bytes. Throws if PumpPortal returns a non-200 response.
 */
export async function buildPumpTx(params: TradeParams): Promise<Uint8Array> {
  const res = await fetch(PUMP_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey:        params.publicKey,
      action:           params.action,
      mint:             params.mint,
      amount:           params.amount,
      denominatedInSol: params.denominatedInSol !== false ? "true" : "false",
      slippage:         params.slippage  ?? 15,
      priorityFee:      params.priorityFee ?? 0.0005,
      pool:             params.pool ?? "pump",
      ...(params.tokenMetadata && { tokenMetadata: params.tokenMetadata }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PumpPortal ${res.status}: ${text || "Request failed"}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

// ── PumpPortalService class ──────────────────────────────────────────────────

export class PumpPortalService {
  /**
   * Standard Phantom path: build tx → Phantom signs + sends in one step.
   * No Jito; uses pump.fun's own RPC for submission.
   */
  async phantomTrade(params: TradeParams): Promise<TradeResult> {
    const bytes = await buildPumpTx(params);
    const signature = await signAndSendBytes(bytes);
    return { success: true, mode: "phantom", signature };
  }

  /**
   * Jito Phantom path: build tx → Phantom signs → submit as Jito bundle.
   * Anti-MEV; the user's wallet pays the tip.
   */
  async jitoPhantomTrade(params: TradeParams & { tipSol?: number }): Promise<TradeResult> {
    const bytes = await buildPumpTx({ ...params, priorityFee: 0.0005 });

    const [signedB64] = await signAllWithPhantom([bytes]);
    const { bundleId } = await jitoSubmit([signedB64]);
    return { success: true, mode: "jito-phantom", bundleId };
  }

  /**
   * Jito GEASS server path: build tx with GEASS pubkey in browser → send
   * unsigned bytes to /api/jito/snipe → server signs + adds tip + submits bundle.
   * Instant, no Phantom interaction needed.
   */
  async jitoServerTrade(
    params: TradeParams & { tipSol?: number },
    geassPublicKey: string,
  ): Promise<TradeResult> {
    // Build tx in browser (PumpPortal blocks server IPs)
    const bytes = await buildPumpTx({ ...params, publicKey: geassPublicKey });
    const buyTxB64 = Buffer.from(bytes).toString("base64");

    const r = await fetch("/api/jito/snipe", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyTxB64, tipSol: params.tipSol }),
    });
    if (!r.ok) {
      let msg = `jito-snipe ${r.status}`;
      try { const j = await r.json(); if (j.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    const { bundleId } = await r.json();
    return { success: true, mode: "jito-server", bundleId };
  }
}

/** Singleton — import and use directly in components. */
export const pumpPortal = new PumpPortalService();
