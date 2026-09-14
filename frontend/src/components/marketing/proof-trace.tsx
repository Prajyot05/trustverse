import { Building2, Check, ScanSearch, UserRound } from "lucide-react";
import { HashChip } from "@/components/data/hash-chip";
import { StatusBadge } from "@/components/data/status-badge";

const NODES = [
  { icon: Building2, label: "Issuer", caption: "anchors a Poseidon commitment" },
  { icon: UserRound, label: "Holder", caption: "proves CGPA ≥ threshold" },
  { icon: ScanSearch, label: "Verifier", caption: "checks the proof on-chain" },
];

/**
 * Static hero visual: issuer → holder → verifier trace with mono commitment
 * hashes and a verified result. No live data — purely illustrative.
 */
export function ProofTrace() {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        {NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-11 items-center justify-center rounded-full border border-border bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{node.label}</p>
                  <p className="mt-0.5 max-w-[7rem] text-[11px] text-muted-foreground">
                    {node.caption}
                  </p>
                </div>
              </div>
              {i < NODES.length - 1 && (
                <div className="relative mx-1 top-[22px] h-px flex-1 self-start bg-border">
                  <span className="absolute inset-0 origin-left animate-pulse bg-primary/60" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
        <HashChip
          value="0x8f2a41c9e7d3b0f1a5c8e6d4b2a19f7c3e5d1b8a4f6c2e0d9b7a3f5c1e8d6b4a"
          label="credentialRoot"
          copyable={false}
          className="w-full justify-start"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">CGPA ≥ 8.0 — proof verified</span>
          <StatusBadge status="verified" />
        </div>
      </div>

      <div className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm">
        <Check className="size-4" />
      </div>
    </div>
  );
}
