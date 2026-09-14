import * as React from "react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

/** Small metric tile used in dashboard summary rows. */
export function StatCard({ icon, label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <div className="flex items-center justify-between px-4">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>
        )}
      </div>
      <div className="px-4">
        <span className="font-heading text-2xl font-semibold text-foreground">
          {value}
        </span>
      </div>
      {hint && (
        <div className="px-4 text-xs text-muted-foreground">{hint}</div>
      )}
    </Card>
  );
}
