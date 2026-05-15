import "server-only";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "./rateLimit";

interface LimitOptions {
  /** Logical bucket name (e.g. "scan", "trade"). Separate buckets per key. */
  bucket: string;
  /** Max requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Returns a 429 NextResponse if the caller exceeded the limit, otherwise null.
 */
export function enforceRateLimit(req: Request, opts: LimitOptions): NextResponse | null {
  const ip = clientIp(req);
  const res = rateLimit(`${opts.bucket}:${ip}`, opts.max, opts.windowMs);
  if (res.ok) return null;
  return NextResponse.json(
    { error: "rate_limited", retryAfter: res.retryAfterSec, limit: res.limit },
    {
      status: 429,
      headers: {
        "Retry-After": String(res.retryAfterSec),
        "X-RateLimit-Limit": String(res.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
