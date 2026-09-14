import * as React from "react";
import { cn } from "cn";

interface DataFieldProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
  valueClassName?: string;
}

/**
 * Micro-caps label stacked over a value. The base unit for rendering
 * verifiable facts (DIDs, timestamps, commitments, scores) consistently.
 */
export function DataField({
  label,
  value,
  mono = false,
  className,
  valueClassName,
}: DataFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div
        className={cn(
          "text-sm text-foreground break-all",
          mono && "font-mono text-[13px]",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  );
}
