"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { truncateMiddle } from "@/lib/format";

interface HashChipProps {
  value: string;
  label?: string;
  start?: number;
  end?: number;
  copyable?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Compact mono chip for hashes, DIDs, addresses and commitments.
 * Truncates the middle and offers a one-click copy of the full value.
 */
export function HashChip({
  value,
  label,
  start = 8,
  end = 6,
  copyable = true,
  className,
  size = "sm",
}: HashChipProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/50 font-mono text-foreground/90",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "md" && "px-3 py-2 text-sm",
        className
      )}
      title={value}
    >
      {label && (
        <span className="shrink-0 font-sans text-[0.8125rem] font-medium tracking-normal text-muted-foreground select-none">
          {label}
        </span>
      )}
      <span className="truncate">{truncateMiddle(value, start, end)}</span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label ?? "value"} to clipboard`}
          className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check className={size === "md" ? "size-4" : "size-3.5"} />
          ) : (
            <Copy className={size === "md" ? "size-4" : "size-3.5"} />
          )}
        </button>
      )}
    </span>
  );
}
