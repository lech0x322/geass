"use client";

/**
 * AES-256-GCM encryption/decryption via the browser's Web Crypto API.
 * No external dependencies — available in all modern browsers.
 */

const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt arbitrary bytes with a password. Returns a base64 blob (salt+iv+ciphertext). */
export async function encryptBytes(data: Uint8Array, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key  = await deriveKey(password, salt);
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, data.buffer as ArrayBuffer);

  const out = new Uint8Array(SALT_BYTES + IV_BYTES + ct.byteLength);
  out.set(salt, 0);
  out.set(iv, SALT_BYTES);
  out.set(new Uint8Array(ct), SALT_BYTES + IV_BYTES);

  let s = "";
  for (let i = 0; i < out.length; i++) s += String.fromCharCode(out[i]);
  return btoa(s);
}

/** Decrypt a blob produced by encryptBytes. Throws if password is wrong. */
export async function decryptBytes(blob: string, password: string): Promise<Uint8Array> {
  const raw = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const salt = raw.slice(0, SALT_BYTES);
  const iv   = raw.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ct   = raw.slice(SALT_BYTES + IV_BYTES);
  const key  = await deriveKey(password, salt);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, ct);
    return new Uint8Array(pt);
  } catch {
    throw new Error("Wrong password or corrupted data");
  }
}
