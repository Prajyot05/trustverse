/**
 * Formatting helpers for hashes, DIDs, addresses and timestamps.
 * Kept separate from contracts.ts so presentational code never needs to
 * import chain/ABI concerns.
 */

/** Truncates a long string (hash, DID, address) to `start…end` characters. */
export function truncateMiddle(value: string, start = 6, end = 4): string {
  if (!value) return "";
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

/** Formats a did:ethr:0x... string by truncating only the address portion. */
export function formatDid(did: string, start = 6, end = 4): string {
  if (!did) return "";
  const parts = did.split(":");
  const addr = parts[parts.length - 1];
  if (!addr || addr.length <= start + end + 1) return did;
  parts[parts.length - 1] = truncateMiddle(addr, start, end);
  return parts.join(":");
}

/** Formats a unix (seconds) timestamp into a readable local date/time string. */
export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Formats a 0-1 authenticity/confidence score as a whole percentage. */
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
