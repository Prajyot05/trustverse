"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useServices } from "@/services";
import { cn } from "cn";

export function ModeChip({ className }: { className?: string }) {
  const { mode } = useServices();
  if (mode === "demo") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning",
          className
        )}
      >
        <FlaskConical className="size-3" />
        Sandbox
      </span>
    );
  }
  return (
    <Link
      href="/demo"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground",
        className
      )}
    >
      Live
    </Link>
  );
}
