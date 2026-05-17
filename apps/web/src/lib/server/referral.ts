import "server-only";

interface RefStats { clicks: number; referrals: number }

const store = new Map<string, RefStats>();

function get(code: string): RefStats {
  if (!store.has(code)) store.set(code, { clicks: 0, referrals: 0 });
  return store.get(code)!;
}

export function recordClick(code: string): RefStats {
  const s = get(code);
  s.clicks++;
  return s;
}

export function recordReferral(code: string): RefStats {
  const s = get(code);
  s.referrals++;
  return s;
}

export function getStats(code: string): RefStats {
  return { ...get(code) };
}
