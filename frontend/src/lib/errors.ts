/** User-facing copy for wallet / contract / network failures. */

export interface FriendlyError {
  title: string;
  description?: string;
}

function asRecord(e: unknown): Record<string, unknown> | null {
  if (typeof e === "object" && e !== null) return e as Record<string, unknown>;
  return null;
}

function collectText(e: unknown): string {
  const parts: string[] = [];
  if (e instanceof Error) parts.push(e.message);
  const r = asRecord(e);
  if (r) {
    if (typeof r.code === "string" || typeof r.code === "number") {
      parts.push(String(r.code));
    }
    if (typeof r.reason === "string") parts.push(r.reason);
    if (typeof r.shortMessage === "string") parts.push(r.shortMessage);
    if (typeof r.message === "string") parts.push(r.message);
    const info = asRecord(r.info);
    const nested = asRecord(info?.error);
    if (typeof nested?.message === "string") parts.push(nested.message);
    if (typeof nested?.code === "number" || typeof nested?.code === "string") {
      parts.push(String(nested.code));
    }
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Maps ethers / MetaMask / fetch failures to short, actionable toast copy.
 * Never surfaces raw ACTION_REJECTED payloads to the user.
 */
export function friendlyError(
  e: unknown,
  fallback: FriendlyError = {
    title: "Something went wrong",
    description: "Please try again. If it keeps failing, check MetaMask and the backend.",
  }
): FriendlyError {
  const text = collectText(e);
  const code = asRecord(e)?.code;

  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    text.includes("action_rejected") ||
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("ethers-user-denied")
  ) {
    return {
      title: "Transaction cancelled",
      description: "You rejected the request in MetaMask. Nothing was submitted on-chain.",
    };
  }

  if (
    text.includes("insufficient funds") ||
    text.includes("insufficient balance")
  ) {
    return {
      title: "Insufficient funds",
      description: "Your wallet needs more ETH to cover gas for this transaction.",
    };
  }

  if (
    text.includes("network") ||
    text.includes("chain") ||
    text.includes("wrong network") ||
    text.includes("unsupported chain")
  ) {
    return {
      title: "Wrong network",
      description: "Switch MetaMask to the local Hardhat / Anvil network and try again.",
    };
  }

  if (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("connection refused") ||
    text.includes("err_connection")
  ) {
    return {
      title: "Cannot reach the backend",
      description: "Start it with ./scripts/dev.sh, then try again.",
    };
  }

  if (
    text.includes("metamask") &&
    (text.includes("not found") || text.includes("undefined"))
  ) {
    return {
      title: "MetaMask not found",
      description: "Install the MetaMask browser extension to connect a wallet.",
    };
  }

  if (text.includes("contract addresses not configured") || text.includes("invalid address")) {
    return {
      title: "Contracts not configured",
      description: "Check frontend/.env.local for NEXT_PUBLIC_* contract addresses.",
    };
  }

  if (text.includes("nonce") || text.includes("replacement fee")) {
    return {
      title: "Pending transaction conflict",
      description: "Clear or speed up pending MetaMask transactions, then retry.",
    };
  }

  // Prefer a short ethers shortMessage when it is already human-readable
  const r = asRecord(e);
  const short =
    (typeof r?.shortMessage === "string" && r.shortMessage) ||
    (typeof r?.reason === "string" && r.reason) ||
    (e instanceof Error ? e.message : null);

  if (short && short.length < 120 && !short.includes("action=") && !short.includes("jsonrpc")) {
    return { title: fallback.title, description: short };
  }

  return fallback;
}

/** @deprecated Prefer friendlyError — kept for call sites that need a single string. */
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  const f = friendlyError(e, { title: fallback });
  return f.description ? `${f.title}: ${f.description}` : f.title;
}
