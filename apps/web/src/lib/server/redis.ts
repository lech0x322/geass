import "server-only";

/**
 * Backwards-compatibility shim.
 *
 * The app's persistence was migrated from Upstash Redis to Neon Postgres.
 * The previous Redis wrapper exposed a `redis` object; every consumer still
 * imports `{ redis }` from here, so we keep that name and route it to the
 * Postgres-backed key/value store in `./kv`. The public surface
 * (`get`, `set`, `hget`, `hset`, `hgetall`, `lpushTrim`, `lrange`,
 * `available`) is identical, so no call site needed to change.
 *
 * New code should import `{ kv }` from "./kv" directly.
 */

export { kv as redis } from "./kv";
