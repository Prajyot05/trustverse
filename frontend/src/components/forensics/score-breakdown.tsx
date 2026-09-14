import * as React from "react";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";

export interface ScoreComponent {
  label: string;
  points: number;
  max?: number;
}

interface ScoreBreakdownProps {
  components: ScoreComponent[];
  className?: string;
}

/** Renders the point contributions that make up a composite trust score. */
export function ScoreBreakdown({ components, className }: ScoreBreakdownProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {components.map((c) => {
        const max = c.max ?? 25;
        const pct = Math.max(0, Math.min(100, (c.points / max) * 100));
        return (
          <div key={c.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-mono text-foreground/80">
                {c.points}/{max}
              </span>
            </div>
            <Progress value={pct} className="h-1" />
          </div>
        );
      })}
    </div>
  );
}
