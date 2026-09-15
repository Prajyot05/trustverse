"use client";

import { AlertTriangle } from "lucide-react";
import { useIdentity } from "@/services";
import { EXPECTED_CHAIN_ID, chainLabel } from "@/lib/network";
import { Button } from "@/components/ui/button";

export function NetworkBanner() {
  const { isWrongNetwork, chainId, switchNetwork, sessionKind } = useIdentity();
  if (sessionKind !== "metamask" || !isWrongNetwork) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm sm:px-6">
      <AlertTriangle className="size-4 shrink-0 text-warning" />
      <p className="min-w-0 flex-1">
        Connected to {chainLabel(chainId ?? null)}. TrustVerse expects{" "}
        {chainLabel(EXPECTED_CHAIN_ID)}.
      </p>
      <Button type="button" size="sm" onClick={() => void switchNetwork?.()}>
        Switch network
      </Button>
    </div>
  );
}
