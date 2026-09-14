import * as React from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";
import { DataField } from "@/components/data/data-field";
import { HashChip } from "@/components/data/hash-chip";
import { StatusBadge, type StatusKind } from "@/components/data/status-badge";

interface CredentialCardField {
  label: string;
  value: React.ReactNode;
}

interface CredentialCardProps {
  /** "detail" — holder wallet tile. "row" — compact issuer dashboard row. */
  variant?: "detail" | "row";
  title?: string;
  subtitle?: string;
  hash: string;
  status: StatusKind;
  fields?: CredentialCardField[];
  commitment?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Renders an issued credential as either a holder-facing "ID card" tile
 * (detail) or an issuer dashboard row (row). Shared so both surfaces stay
 * visually consistent.
 */
export function CredentialCard({
  variant = "detail",
  title,
  subtitle,
  hash,
  status,
  fields = [],
  commitment,
  actions,
  className,
}: CredentialCardProps) {
  if (variant === "row") {
    return (
      <Card className={cn("flex-row items-center gap-4 p-4", className)}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <GraduationCap className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs text-foreground/80">{hash}</p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={status} />
          {actions}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("gap-4 border-accent/40 bg-accent/20", className)}>
      <div className="flex items-start justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-4 px-6">
          {fields.map((field) => (
            <DataField key={field.label} label={field.label} value={field.value} />
          ))}
        </div>
      )}

      {commitment && (
        <div className="px-6">
          <HashChip value={commitment} label="commitment" className="w-full" />
        </div>
      )}

      {actions && <div className="px-6">{actions}</div>}
    </Card>
  );
}
