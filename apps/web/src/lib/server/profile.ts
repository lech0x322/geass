import "server-only";
import { redis } from "./redis";

// Redis keys:
//   profile:{wallet}  → { username, displayName, emoji, createdAt, updatedAt }
//   username:{lower}  → wallet   (uniqueness index on handle)

const TTL = 365 * 24 * 3600; // 1 year

export const CREATOR_USERNAMES = ["Lech0x322"];

export interface UserProfile {
  wallet:      string;
  username:    string;  // unique handle — like @username
  displayName: string;  // public name shown on profile — not unique
  emoji:       string;
  createdAt:   number;
  updatedAt:   number;
  isCreator:   boolean;
}

function profileKey(wallet: string) { return `profile:${wallet}`; }
function usernameKey(lower: string)  { return `username:${lower}`; }

export async function getProfile(wallet: string): Promise<UserProfile | null> {
  const raw = await redis.get<{
    username: string;
    displayName?: string;
    emoji: string;
    createdAt: number;
    updatedAt: number;
  }>(profileKey(wallet));
  if (!raw) return null;
  return {
    ...raw,
    displayName: raw.displayName ?? raw.username, // fallback for old records
    wallet,
    isCreator: CREATOR_USERNAMES.some(u => u.toLowerCase() === raw.username.toLowerCase()),
  };
}

export async function setProfile(
  wallet:      string,
  username:    string,
  emoji:       string,
  displayName: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!wallet) return { ok: false, error: "Wallet required" };

  // Validate unique handle
  const handle = username.trim().slice(0, 20).toLowerCase();
  if (!handle || handle.length < 2) return { ok: false, error: "Username must be at least 2 characters" };
  if (!/^[a-z0-9_]+$/.test(handle)) return { ok: false, error: "Username may only contain letters, numbers and _" };
  const displayTrimmed = displayName.trim().slice(0, 32) || handle;

  // Check uniqueness
  const existingOwner = await redis.get<string>(usernameKey(handle));
  if (existingOwner && existingOwner !== wallet) {
    return { ok: false, error: "Username already taken" };
  }

  // Load existing to free old username index if handle changed
  const existing = await redis.get<{ username: string; createdAt: number }>(profileKey(wallet));
  const now = Date.now();
  const createdAt = existing?.createdAt ?? now;

  if (existing?.username && existing.username.toLowerCase() !== handle) {
    await redis.set(usernameKey(existing.username.toLowerCase()), "", 1);
  }

  await Promise.all([
    redis.set(profileKey(wallet), { username: handle, displayName: displayTrimmed, emoji, createdAt, updatedAt: now }, TTL),
    redis.set(usernameKey(handle), wallet, TTL),
  ]);

  return { ok: true };
}
