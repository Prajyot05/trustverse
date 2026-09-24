"use client";

import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useServices,
  ALICE_CRED_HASH,
  BOB_CRED_HASH,
  type PublicVerifyResult,
} from "@/services";
import { formatTimestamp } from "@/lib/format";
import { DataField } from "@/components/data/data-field";
import { HashChip } from "@/components/data/hash-chip";
import { TechnicalDetails } from "@/components/data/technical-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function PublicVerifyInner() {
  const { api, product, mode } = useServices();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<PublicVerifyResult | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    const share = searchParams.get("share");
    const qh = searchParams.get("hash");
    if (qh) setHash(qh);
    if (!share) return;
    let cancelled = false;
    product
      .getShare(share)
      .then((rec) => {
        if (cancelled) return;
        setShareNote(
          rec.result === "pass"
            ? `Share valid: ${rec.issuer_name || "issuer"} attested this holder.`
            : rec.fail_reason || "Share could not be verified"
        );
        if (rec.credential_hash) setHash(rec.credential_hash);
      })
      .catch(() => {
        if (!cancelled) setShareNote("This share link is invalid, expired, or revoked.");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, product]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setIsVerifying(true);
    setResult(null);

    try {
      setResult(await api.publicVerify(hash.trim()));
    } catch (err) {
      console.error(err);
      setResult({
        is_valid: false,
        reason:
          mode === "demo"
            ? "Could not verify this hash in demo mode"
            : "Network error connecting to verification node",
        data: null,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center px-4 py-16 sm:px-6">
      <div className="mb-8 flex w-full flex-col items-center gap-2 text-center">
        <span className="text-sm font-medium text-primary">
          Public verification{mode === "demo" ? " · Demo" : ""}
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verify a credential
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a credential hash, or open a share link from a holder.
        </p>
      </div>

      {shareNote && (
        <Alert className="mb-6 w-full" variant="success">
          <AlertTitle>Share link</AlertTitle>
          <AlertDescription>{shareNote}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleVerify}
        className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-1.5 sm:pl-4 sm:shadow-sm sm:focus-within:border-primary/50 sm:focus-within:ring-3 sm:focus-within:ring-ring/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 sm:border-0 sm:bg-transparent sm:px-0 sm:shadow-none">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Credential hash — 0x…"
            aria-label="Credential hash"
            autoComplete="off"
            spellCheck={false}
            className="h-11 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          type="submit"
          disabled={isVerifying || !hash.trim()}
          size="lg"
          className="w-full shrink-0 sm:w-auto"
        >
          {isVerifying && <Loader2 className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>

      {mode === "demo" && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setHash(ALICE_CRED_HASH);
              setResult(null);
            }}
          >
            Alice (valid)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setHash(BOB_CRED_HASH);
              setResult(null);
            }}
          >
            Bob (revoked)
          </Button>
        </div>
      )}

      {result && (
        <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Alert variant={result.is_valid ? "success" : "destructive"} className="p-6">
            <span
              className={`mb-2 flex size-11 items-center justify-center rounded-full ${
                result.is_valid
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
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
                <TechnicalDetails
                  className="mt-4 sm:col-span-2"
                  items={[
                    { label: "Issuer DID", value: result.data.issuerDID },
                    { label: "Commitment", value: result.data.poseidonCommitment },
                  ]}
                />
              </div>
            )}
          </Alert>
        </div>
      )}
    </div>
  );
}

export function PublicVerify() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-muted-foreground">Loading…</p>}>
      <PublicVerifyInner />
    </Suspense>
  );
}
