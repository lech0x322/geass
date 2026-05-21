import "server-only";

import nacl from "tweetnacl";
import { SignJWT, jwtVerify } from "jose";
import bs58 from "bs58";
import { SIWS_JWT_SECRET, SIWS_DOMAIN } from "@/lib/env";

const ALGORITHM = "HS256";
const SESSION_DAYS = 7;

function jwtKey(): Uint8Array {
  return new TextEncoder().encode(SIWS_JWT_SECRET);
}

export function buildSiwsMessage(address: string, nonce: string, issuedAt: string): string {
  return (
    `${SIWS_DOMAIN} wants you to sign in with your Solana account:\n` +
    `${address}\n\n` +
    `Sign in to GEASS — Solana Alpha Intelligence\n\n` +
    `URI: https://${SIWS_DOMAIN}\n` +
    `Version: 1\n` +
    `Chain ID: mainnet\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}`
  );
}

export function verifySiwsSignature(
  message: string,
  signatureB58OrB64: string,
  addressB58: string,
): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const pubKey   = bs58.decode(addressB58);

    // Signature may arrive as base58 (Phantom signIn) or base64 (signMessage fallback)
    let sig: Uint8Array;
    try {
      sig = bs58.decode(signatureB58OrB64);
    } catch {
      sig = Uint8Array.from(Buffer.from(signatureB58OrB64, "base64"));
    }

    return nacl.sign.detached.verify(msgBytes, sig, pubKey);
  } catch {
    return false;
  }
}

export async function issueJwt(address: string): Promise<string> {
  return new SignJWT({ sub: address, address })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(jwtKey());
}

export async function verifyJwt(token: string): Promise<{ address: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: [ALGORITHM] });
    const address = payload["address"];
    if (typeof address !== "string") return null;
    return { address };
  } catch {
    return null;
  }
}
