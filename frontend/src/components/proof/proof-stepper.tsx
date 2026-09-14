import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "cn";

export type ProofStepState = "idle" | "active" | "done" | "error";

export interface ProofStep {
  id: string;
  label: string;
  description?: string;
  state: ProofStepState;
}

interface ProofStepperProps {
  steps: ProofStep[];
  className?: string;
}

const stateStyles: Record<
  ProofStepState,
  { circle: string; icon: React.ReactNode; label: string }
> = {
  idle: {
    circle: "border-border bg-background text-muted-foreground",
    icon: null,
    label: "text-muted-foreground",
  },
  active: {
    circle: "border-primary bg-primary/10 text-primary",
    icon: <Loader2 className="size-3.5 animate-spin" />,
    label: "text-foreground",
  },
  done: {
    circle: "border-success bg-success/10 text-success",
    icon: <Check className="size-3.5" />,
    label: "text-foreground",
  },
  error: {
    circle: "border-destructive bg-destructive/10 text-destructive",
    icon: <X className="size-3.5" />,
    label: "text-destructive",
  },
};

/** Vertical stepper for the holder proof flow (select → prove → submit). */
export function ProofStepper({ steps, className }: ProofStepperProps) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, i) => {
        const style = stateStyles[step.state];
        const isLast = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className="absolute top-6 left-[11px] h-[calc(100%-1.5rem)] w-px bg-border"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                style.circle
              )}
            >
              {style.icon ?? i + 1}
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5">
              <span className={cn("text-sm font-medium", style.label)}>
                {step.label}
              </span>
              {step.description && (
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
