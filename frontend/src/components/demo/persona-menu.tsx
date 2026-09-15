"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { useIdentity, DEMO_PERSONAS, getPersonaById, useDemoStore } from "@/services";
import { truncateMiddle } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Demo-mode identity chip: switch persona / copy DID / sign out. */
export function PersonaMenu() {
  const { address, did, label, disconnect, selectPersona } = useIdentity();
  const personaId = useDemoStore((s) => s.personaId);
  const persona = getPersonaById(personaId);
  const [copied, setCopied] = React.useState(false);

  if (!address || !persona) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Users className="size-4" />
        Pick persona
      </Button>
    );
  }

  const handleCopy = async () => {
    if (!did) return;
    await navigator.clipboard.writeText(did);
    setCopied(true);
    toast.success("DID copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full pl-2.5">
          <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
          <span className="max-w-[9rem] truncate text-xs font-medium">
            {label ?? persona.label}
          </span>
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            {truncateMiddle(address, 4, 3)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Demo persona</DropdownMenuLabel>
        <div className="px-1.5 pb-1.5">
          <p className="truncate font-mono text-xs text-muted-foreground">{did}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          Switch persona
        </DropdownMenuLabel>
        {DEMO_PERSONAS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => selectPersona?.(p.id)}
            className={p.id === personaId ? "bg-accent" : undefined}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ${p.avatarColor}`}
            >
              {p.label.charAt(0)}
            </span>
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copy DID
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={disconnect}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
