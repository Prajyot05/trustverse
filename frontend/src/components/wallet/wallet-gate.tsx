"use client";

import * as React from "react";
import { Loader2, Wallet } from "lucide-react";
import { useServices, useIdentity, type PersonaRole } from "@/services";
import { PersonaPicker } from "@/components/demo/persona-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WalletGateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Highlight these roles in the demo persona picker. */
  suggestedRoles?: PersonaRole[];
}

/**
 * Shared gate. In live mode: Connect MetaMask. In demo mode: PersonaPicker.
 */
export function WalletGate({
  icon,
  title,
  description,
  suggestedRoles,
}: WalletGateProps) {
  const { mode } = useServices();
  const { connect, isConnecting, selectPersona, connectEmbedded } = useIdentity();

  if (mode === "demo") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <Card className="flex w-full max-w-lg flex-col items-center gap-6 p-8 sm:p-10">
          {icon && (
            <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:size-6">
              {icon}
            </div>
          )}
          <PersonaPicker
            suggestedRoles={suggestedRoles}
            title={title}
            description={description ?? "Pick a persona to explore this portal."}
            onSelect={(id) => selectPersona?.(id)}
          />
        </Card>
      </div>
    );
  }

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
          {isConnecting ? "Connecting…" : "Connect MetaMask"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void connectEmbedded?.()}
        >
          Continue with a passkey wallet
        </Button>
        <p className="text-xs text-muted-foreground">
          Passkey wallets stay on this device. Gas is sponsored. MetaMask is optional.
        </p>
      </Card>
    </div>
  );
}
