import * as React from "react";
import { cn } from "cn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state. Dot-grid is decorative only (absolute layer) so
 * title/description never inherit the fade mask.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className
      )}
    >
      <div
        className="bg-dot-grid bg-dot-grid-fade pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        {icon && (
          <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
