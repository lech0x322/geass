"use client";

import { Keypair } from "@solana/web3.js";
import { encryptBytes, decryptBytes } from "./cryptoWallet";

const STORAGE_KEY = "geass:wallet:v1";

export interface StoredWallet {
  publicKey: string;
  encrypted: string; // AES-GCM blob of the 64-byte secretKey
  createdAt: number;
}

/** Generate a fresh Solana keypair and return the base58 private key for backup display. */
export function generateWallet(): { keypair: Keypair; privateKeyB58: string } {
  const keypair = Keypair.generate();
  return { keypair, privateKeyB58: toBase58(keypair.secretKey) };
}

/** Parse a private key from base58 string (64-byte Solana secretKey). */
export function keypairFromPrivateKey(b58: string): Keypair {
  try {
    return Keypair.fromSecretKey(fromBase58(b58));
  } catch {
    throw new Error("Invalid private key format. Must be a 64-byte base58 Solana private key.");
  }
}

export async function encryptAndStore(keypair: Keypair, password: string): Promise<void> {
  const blob = await encryptBytes(keypair.secretKey, password);
  const stored: StoredWallet = {
    publicKey: keypair.publicKey.toBase58(),
    encrypted: blob,
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export async function decryptStoredWallet(password: string): Promise<Keypair> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No internal wallet found");
  const stored: StoredWallet = JSON.parse(raw);
  const secretKey = await decryptBytes(stored.encrypted, password);
  return Keypair.fromSecretKey(secretKey);
}

export function getStoredWalletMeta(): StoredWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearStoredWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Base58 helpers (Solana alphabet) ────────────────────────────────────────

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(58);

function toBase58(bytes: Uint8Array): string {
  let n = BigInt("0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""));
  let s = "";
  while (n > 0n) { s = ALPHABET[Number(n % BASE)] + s; n /= BASE; }
  for (const b of bytes) { if (b !== 0) break; s = "1" + s; }
  return s;
}

function fromBase58(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const idx = ALPHABET.indexOf(c);
    if (idx < 0) throw new Error("Invalid base58 character");
    n = n * BASE + BigInt(idx);
  }
  const hex = n.toString(16).padStart(128, "0"); // 64 bytes = 128 hex chars
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
