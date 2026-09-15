import * as React from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

export type StatusKind =
  | "active"
  | "revoked"
  | "pending"
  | "fulfilled"
  | "anchored"
  | "registered"
  | "unregistered"
  | "verified"
  | "failed"
  | "expired"
  | "waiting"
  | "neutral";

const STATUS_MAP: Record<
  StatusKind,
  { label: string; variant: "success" | "warning" | "destructive" | "outline" | "secondary"; dot: string }
> = {
  active: { label: "Active", variant: "success", dot: "bg-success" },
  verified: { label: "Verified", variant: "success", dot: "bg-success" },
  fulfilled: { label: "Fulfilled", variant: "success", dot: "bg-success" },
  anchored: { label: "Anchored", variant: "success", dot: "bg-success" },
  registered: { label: "Registered", variant: "success", dot: "bg-success" },
  pending: { label: "Pending", variant: "warning", dot: "bg-warning" },
  waiting: { label: "Waiting", variant: "warning", dot: "bg-warning" },
  unregistered: {
    label: "Not registered",
    variant: "warning",
    dot: "bg-warning",
  },
  revoked: { label: "Revoked", variant: "destructive", dot: "bg-destructive" },
  failed: { label: "Failed", variant: "destructive", dot: "bg-destructive" },
  expired: { label: "Expired", variant: "destructive", dot: "bg-destructive" },
  neutral: { label: "—", variant: "outline", dot: "bg-muted-foreground" },
};

interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
  pulse?: boolean;
  className?: string;
}

/**
 * Dot + label status indicator. Never communicates state by color alone —
 * every status also renders a readable word.
 */
export function StatusBadge({
  status,
  label,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          config.dot,
          pulse && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {label ?? config.label}
    </Badge>
  );
}
