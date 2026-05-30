import "server-only";
import { redis } from "./redis";

// Redis keys:
//   profile:{wallet}   → { username, emoji, createdAt, updatedAt }
//   username:{lower}   → wallet   (uniqueness index)

const TTL = 365 * 24 * 3600; // 1 year

export const CREATOR_USERNAMES = ["Lech0x322"];

export interface UserProfile {
  wallet:    string;
  username:  string;
  emoji:     string;
  createdAt: number;
  updatedAt: number;
  isCreator: boolean;
}

function profileKey(wallet: string) { return `profile:${wallet}`; }
function usernameKey(lower: string)  { return `username:${lower}`; }

export async function getProfile(wallet: string): Promise<UserProfile | null> {
  const raw = await redis.get<{ username: string; emoji: string; createdAt: number; updatedAt: number }>(profileKey(wallet));
  if (!raw) return null;
  return {
    ...raw,
    wallet,
    isCreator: CREATOR_USERNAMES.some(u => u.toLowerCase() === raw.username.toLowerCase()),
  };
}

export async function setProfile(
  wallet: string,
  username: string,
  emoji: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!wallet) return { ok: false, error: "Wallet required" };

  const trimmed = username.trim().slice(0, 24);
  if (!trimmed || trimmed.length < 2) return { ok: false, error: "Username must be at least 2 characters" };
  if (!/^[a-zA-Z0-9_.\-]+$/.test(trimmed)) return { ok: false, error: "Username may only contain letters, numbers, _, . and -" };

  const lower = trimmed.toLowerCase();

  // Check if this username is already owned by a different wallet
  const existingOwner = await redis.get<string>(usernameKey(lower));
  if (existingOwner && existingOwner !== wallet) {
    return { ok: false, error: "Username already taken" };
  }

  // Load existing profile to free old username index if changed
  const existing = await redis.get<{ username: string; emoji: string; createdAt: number }>(profileKey(wallet));

  const now = Date.now();
  const createdAt = existing?.createdAt ?? now;

  // If username changed, expire old index immediately (TTL=1s)
  if (existing?.username && existing.username.toLowerCase() !== lower) {
    await redis.set(usernameKey(existing.username.toLowerCase()), "", 1);
  }

  await Promise.all([
    redis.set(profileKey(wallet), { username: trimmed, emoji, createdAt, updatedAt: now }, TTL),
    redis.set(usernameKey(lower), wallet, TTL),
  ]);

  return { ok: true };
}
