"use client";

import * as React from "react";
import { cn } from "cn";
import {
  DEMO_PERSONAS,
  type DemoPersona,
  type PersonaRole,
} from "@/services";
import { truncateMiddle } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";

interface PersonaPickerProps {
  suggestedRoles?: PersonaRole[];
  onSelect: (personaId: string) => void;
  title?: string;
  description?: string;
}

export function PersonaPicker({
  suggestedRoles,
  onSelect,
  title = "Choose a demo persona",
  description = "No wallet needed — pick who you want to act as.",
}: PersonaPickerProps) {
  const sorted = React.useMemo(() => {
    if (!suggestedRoles?.length) return DEMO_PERSONAS;
    const preferred = DEMO_PERSONAS.filter((p) => suggestedRoles.includes(p.role));
    const rest = DEMO_PERSONAS.filter((p) => !suggestedRoles.includes(p.role));
    return [...preferred, ...rest];
  }, [suggestedRoles]);

  return (
    <div className="flex w-full max-w-lg flex-col gap-5">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            highlighted={suggestedRoles?.includes(persona.role)}
            onSelect={() => onSelect(persona.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  highlighted,
  onSelect,
}: {
  persona: DemoPersona;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        highlighted
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          persona.avatarColor
        )}
        aria-hidden
      >
        {persona.label.charAt(0)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{persona.label}</span>
        <span className="block text-xs text-muted-foreground">{persona.roleHint}</span>
        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground/80">
          {truncateMiddle(persona.address, 6, 4)}
        </span>
      </span>
      <span
        className={buttonVariants({
          size: "sm",
          variant: highlighted ? "default" : "outline",
        })}
        aria-hidden
      >
        Enter
      </span>
    </button>
  );
}
