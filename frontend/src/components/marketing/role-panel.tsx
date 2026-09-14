import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

interface RolePanelProps {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  ctaLabel: string;
  visual: React.ReactNode;
  reverse?: boolean;
}

/** Alternating role explainer: copy + bullet list on one side, a live UI vignette on the other. */
export function RolePanel({
  eyebrow,
  title,
  description,
  bullets,
  href,
  ctaLabel,
  visual,
  reverse = false,
}: RolePanelProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reverse && "lg:[&>*:first-child]:order-2"
      )}
    >
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
          {eyebrow}
        </span>
        <h3 className="font-heading text-2xl font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <ul className="flex flex-col gap-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {bullet}
            </li>
          ))}
        </ul>
        <div>
          <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <div>{visual}</div>
    </div>
  );
}
