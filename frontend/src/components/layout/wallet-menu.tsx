"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useServices, useIdentity } from "@/services";
import { truncateMiddle } from "@/lib/format";
import { PersonaMenu } from "@/components/demo/persona-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Wallet connection control for the app shell topbar.
 * In demo mode renders PersonaMenu instead of MetaMask connect.
 */
export function WalletMenu() {
  const { mode } = useServices();
  const { address, did, connect, disconnect, isConnecting } = useIdentity();
  const [copied, setCopied] = React.useState(false);

  if (mode === "demo") {
    return <PersonaMenu />;
  }

  if (!address) {
    return (
      <Button onClick={connect} disabled={isConnecting} size="sm">
        <Wallet className="size-4" />
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-full pl-2.5"
        >
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          <span className="font-mono text-xs">{truncateMiddle(address, 6, 4)}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Connected identity</DropdownMenuLabel>
        <div className="px-1.5 pb-1.5">
          <p className="truncate font-mono text-xs text-muted-foreground">{did}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={disconnect}>
          <LogOut className="size-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
