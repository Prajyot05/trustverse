import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";

const SEES = [
  "Whether the CGPA threshold holds — true or false",
  "Whether the credential is currently revoked",
  "Cryptographic proof that both statements are valid",
];

const NEVER_SEES = [
  "The holder's actual CGPA or grades",
  "The degree name, dates, or any transcript detail",
  "Any data not explicitly requested and proven",
];

/** Two-column comparison making the privacy guarantee concrete. */
export function PrivacyBlock() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="gap-3 p-6">
        <div className="flex items-center gap-2 px-6">
          <span className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-3.5" />
          </span>
          <p className="font-heading text-sm font-semibold text-foreground">
            What a verifier sees
          </p>
        </div>
        <ul className="flex flex-col gap-2.5 px-6">
          {SEES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="gap-3 p-6">
        <div className="flex items-center gap-2 px-6">
          <span className="flex size-6 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <X className="size-3.5" />
          </span>
          <p className="font-heading text-sm font-semibold text-foreground">
            What a verifier never sees
          </p>
        </div>
        <ul className="flex flex-col gap-2.5 px-6">
          {NEVER_SEES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <X className="mt-0.5 size-4 shrink-0 text-destructive" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
