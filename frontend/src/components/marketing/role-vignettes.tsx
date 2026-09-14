import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataField } from "@/components/data/data-field";
import { HashChip } from "@/components/data/hash-chip";
import { StatusBadge } from "@/components/data/status-badge";
import { ProofStepper } from "@/components/proof/proof-stepper";

/** Miniature, non-interactive preview of the issuer portal for the landing page. */
export function IssuerVignette() {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between px-6">
        <p className="font-heading text-sm font-semibold text-foreground">
          Issue &amp; anchor credential
        </p>
        <StatusBadge status="registered" />
      </div>
      <div className="grid grid-cols-2 gap-4 px-6">
        <DataField label="Holder DID" value="did:ethr:0x9c4f…21ab" mono />
        <DataField label="Degree" value="B.Sc Computer Science" />
        <DataField label="CGPA" value="8.90" mono />
        <DataField label="Graduation" value="2026-06-15" mono />
      </div>
      <div className="px-6">
        <Button className="w-full" size="sm" disabled>
          <CheckCircle2 className="size-4" />
          Sign anchor in MetaMask
        </Button>
      </div>
    </Card>
  );
}

/** Miniature preview of the holder wallet's in-browser proof flow. */
export function HolderVignette() {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between px-6">
        <p className="font-heading text-sm font-semibold text-foreground">
          Verification request #204
        </p>
        <span className="flex items-center gap-1.5 text-xs text-primary">
          <Loader2 className="size-3.5 animate-spin" /> Proving
        </span>
      </div>
      <div className="px-6">
        <ProofStepper
          steps={[
            { id: "select", label: "Select credential", state: "done" },
            { id: "claim", label: "Prove CGPA ≥ 8.0", state: "done" },
            { id: "nonrev", label: "Prove non-revocation", state: "active" },
            { id: "submit", label: "Submit on-chain", state: "idle" },
          ]}
        />
      </div>
    </Card>
  );
}

/** Miniature preview of a fulfilled verifier request. */
export function VerifierVignette() {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between px-6">
        <p className="font-heading text-sm font-semibold text-foreground">
          Request #204 result
        </p>
        <StatusBadge status="verified" />
      </div>
      <div className="flex flex-col gap-3 px-6">
        <HashChip
          value="0x4a1c8e6d4b2a19f7c3e5d1b8a4f6c2e0d9b7a3f5c1e8d6b4a2c9e7d3b0f1a5"
          label="claim tx"
          copyable={false}
          className="w-full justify-start"
        />
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          No attribute values were disclosed — only that the threshold holds
          and the credential is not revoked.
        </p>
      </div>
    </Card>
  );
}
