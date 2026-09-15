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
    <Card className={cn("gap-2 p-5", className)}>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>
        )}
      </div>
      <div className="px-1">
        <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
      </div>
      {hint && (
        <div className="px-1 text-sm text-muted-foreground">{hint}</div>
      )}
    </Card>
  );
}
