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
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs text-foreground/80",
        className
      )}
      title={value}
    >
      {label && (
        <span className="text-muted-foreground/70 select-none">{label}</span>
      )}
      <span className="truncate">{truncateMiddle(value, start, end)}</span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label ?? "value"} to clipboard`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      )}
    </span>
  );
}
