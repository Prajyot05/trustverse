"use client";

import { HashChip } from "@/components/data/hash-chip";

export interface TechItem {
  label: string;
  value?: string | number | null;
}

export function TechnicalDetails({ items, className }: { items: TechItem[]; className?: string }) {
  const visible = items.filter((i) => i.value != null && String(i.value).length > 0);
  if (!visible.length) return null;
  return (
    <details className={className ?? "rounded-lg border border-border bg-muted/30 px-3 py-2"}>
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
        Technical details
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        {visible.map((item) => (
          <HashChip
            key={item.label}
            value={String(item.value)}
            label={item.label}
            className="w-full justify-start"
          />
        ))}
      </div>
    </details>
  );
}
