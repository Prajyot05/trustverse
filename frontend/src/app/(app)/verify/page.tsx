"use client";
import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { API_URL } from "@/lib/contracts";
import { formatTimestamp } from "@/lib/format";
import { DataField } from "@/components/data/data-field";
import { HashChip } from "@/components/data/hash-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VerifyResult {
  is_valid: boolean;
  reason?: string;
  data?: {
    issuerDID: string;
    anchoredAt: number;
    poseidonCommitment: string;
  } | null;
}

export default function PublicVerifyPage() {
  const [hash, setHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash) return;
    setIsVerifying(true);
    setResult(null);

    try {
      const formattedHash = hash.startsWith("0x") ? hash : `0x${hash}`;
      const res = await fetch(`${API_URL}/api/v1/verify/${formattedHash}`);

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setResult({ is_valid: false, reason: errorData.detail || "Verification failed", data: null });
      }
    } catch (e) {
      console.error(e);
      setResult({ is_valid: false, reason: "Network error connecting to verification node", data: null });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center px-4 py-16 sm:px-6">
      <div className="mb-10 flex w-full flex-col items-center gap-3 text-center">
        <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
          Public verification
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verify a credential
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Check the authenticity and on-chain anchoring of any TrustVerse
          credential by its hash.
        </p>
      </div>

      <form
        onSubmit={handleVerify}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-4 shadow-sm focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-ring/50"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="Credential hash — e.g. 0xabc123…"
          aria-label="Credential hash"
          className="h-9 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
        />
        <Button type="submit" disabled={isVerifying || !hash} size="lg">
          {isVerifying && <Loader2 className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>

      {result && (
        <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Alert variant={result.is_valid ? "success" : "destructive"} className="p-6">
            <span
              className={`mb-2 flex size-11 items-center justify-center rounded-full ${
                result.is_valid ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {result.is_valid ? (
                <ShieldCheck className="size-5" />
              ) : (
                <AlertTriangle className="size-5" />
              )}
            </span>
            <AlertTitle className="text-base">
              {result.is_valid ? "Valid credential" : "Verification failed"}
            </AlertTitle>
            <AlertDescription>{result.reason}</AlertDescription>

            {result.data && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <DataField label="Issuer DID" value={result.data.issuerDID} mono />
                <DataField
                  label="Anchored timestamp"
                  value={formatTimestamp(result.data.anchoredAt)}
                />
                <DataField
                  label="Poseidon commitment"
                  value={<HashChip value={result.data.poseidonCommitment} copyable={false} />}
                  className="sm:col-span-2"
                />
              </div>
            )}

            {!result.data && !result.is_valid && (
              <p className="mt-4 border-t border-border pt-4 text-foreground/80">
                This hash does not exist on the TrustVerse anchor registry. It
                may be invalid, from an unverified issuer, or tampered with.
              </p>
            )}
          </Alert>
        </div>
      )}
    </div>
  );
}
