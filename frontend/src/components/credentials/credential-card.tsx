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
  /** Primary human-readable title (degree name, credential type). */
  title?: string;
  /** Secondary line (holder name / issuer). */
  subtitle?: string;
  hash: string;
  status: StatusKind;
  fields?: CredentialCardField[];
  commitment?: string;
  /** Technical identifiers shown under the title in row variant. */
  meta?: Array<{ label: string; value: string }>;
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
  meta,
  actions,
  className,
}: CredentialCardProps) {
  if (variant === "row") {
    const displayTitle = title || "Academic credential";
    return (
      <Card
        className={cn(
          "flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5",
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-heading text-base font-semibold text-foreground">
                {displayTitle}
              </h3>
              <StatusBadge status={status} className="sm:hidden" />
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {(meta ?? [{ label: "Credential hash", value: hash }]).map((item) => (
                <HashChip
                  key={item.label}
                  value={item.value}
                  label={item.label}
                  start={6}
                  end={4}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <StatusBadge status={status} className="hidden sm:inline-flex" />
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

      <div className="flex flex-col gap-2 px-6">
        <HashChip
          value={hash}
          label="Credential hash"
          start={10}
          end={8}
          className="w-full"
        />
        {commitment && (
          <HashChip
            value={commitment}
            label="Commitment"
            start={8}
            end={6}
            className="w-full"
          />
        )}
      </div>

      {actions && <div className="px-6">{actions}</div>}
    </Card>
  );
}
