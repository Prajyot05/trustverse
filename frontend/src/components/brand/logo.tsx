import { cn } from "cn";

interface LogoMarkProps {
  className?: string;
}

/**
 * TrustVerse mark: a hexagonal "trust cell" with a checkmark cut from
 * negative space. Pure currentColor strokes/fills so it renders correctly
 * in both themes without swapping assets.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <path
        d="M16 2 28 8.5V23.5L16 30 4 23.5V8.5L16 2Z"
        className="fill-primary"
      />
      <path
        d="M16 2 28 8.5V23.5L16 30 4 23.5V8.5L16 2Z"
        stroke="currentColor"
        strokeOpacity={0.08}
        strokeWidth={1}
      />
      <path
        d="M10.5 16.2 14.4 20 21.5 12.5"
        stroke="var(--primary-foreground)"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}

export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-7", markClassName)} />
      {showWordmark && (
        <span
          className={cn(
            "font-heading text-[15px] font-semibold tracking-tight text-foreground",
            wordmarkClassName
          )}
        >
          TrustVerse
        </span>
      )}
    </span>
  );
}
