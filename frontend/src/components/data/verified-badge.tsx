import { BadgeCheck } from "lucide-react";
import { cn } from "cn";

export function VerifiedBadge({
  verified,
  name,
  className,
}: {
  verified?: boolean;
  name?: string;
  className?: string;
}) {
  if (!verified) {
    return name ? <span className={className}>{name}</span> : null;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      {name && <span>{name}</span>}
      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
        <BadgeCheck className="size-3" />
        Verified issuer
      </span>
    </span>
  );
}
