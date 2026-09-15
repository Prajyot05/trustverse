"use client";

import Link from "next/link";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/services";
import { Button } from "@/components/ui/button";

/** Persistent banner shown on all /demo/* routes. */
export function DemoBanner() {
  const reset = useDemoStore((s) => s.reset);

  const handleReset = () => {
    reset();
    toast.success("Demo data reset", {
      description: "University, Alice, Bob, and the pending request were restored.",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm sm:px-6">
      <FlaskConical className="size-4 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground/90">
        <span className="font-medium">Demo mode</span>
        <span className="text-muted-foreground">
          {" "}
          — simulated data, no wallet or blockchain.
        </span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="size-3.5" />
          Reset demo data
        </Button>
        <Link
          href="/"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
          Exit demo
        </Link>
      </div>
    </div>
  );
}
