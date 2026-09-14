"use client";

import * as React from "react";
import { Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/store/useWallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WalletGateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

/**
 * Single shared "connect your wallet" gate. Replaces the three copies of
 * `if (!address) return ...` that used to live in the issuer, wallet and
 * verifier pages.
 */
export function WalletGate({ icon, title, description }: WalletGateProps) {
  const { connect, isConnecting } = useWallet();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-10 text-center">
        {icon && (
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:size-6">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button onClick={connect} disabled={isConnecting} size="lg" className="w-full">
          {isConnecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wallet className="size-4" />
          )}
          {isConnecting ? "Connecting…" : "Connect wallet"}
        </Button>
      </Card>
    </div>
  );
}
