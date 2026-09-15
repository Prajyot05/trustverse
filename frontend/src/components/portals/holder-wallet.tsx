"use client";

import { Fingerprint, Loader2, QrCode, Share2, Download } from "lucide-react";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  useServices,
  useIdentity,
  demoWouldPass,
  getPersonaByDid,
  type HolderCredential,
  type VerifyRequest,
} from "@/services";
import { friendlyError } from "@/lib/errors";
import { formatDid } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { QRPanel } from "@/components/data/qr-panel";
import { HashChip } from "@/components/data/hash-chip";
import { CredentialCard } from "@/components/credentials/credential-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ProofStepper, type ProofStep } from "@/components/proof/proof-stepper";
import { TechnicalDetails } from "@/components/data/technical-details";
import { PredicateExplain } from "@/components/predicates/predicate-picker";
import { getPredicate, evaluateLocalPredicate, failReasonLabel } from "@/lib/predicates";
import type { TrustEventRow } from "@/services/types";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProofStage = "idle" | "claim" | "nonrev" | "submitting" | "done" | "error";

function HolderWalletInner() {
  const { mode, api, chain, proofs, product, basePath } = useServices();
  const { address, did, signer } = useIdentity();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get("request");

  const [showProofModal, setShowProofModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<VerifyRequest | null>(null);
  const [stage, setStage] = useState<ProofStage>("idle");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [credentials, setCredentials] = useState<HolderCredential[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VerifyRequest[]>([]);
  const [history, setHistory] = useState<VerifyRequest[]>([]);
  const [activity, setActivity] = useState<TrustEventRow[]>([]);

  const holderDid = did ?? "";
  const isBusy = stage === "claim" || stage === "nonrev" || stage === "submitting";

  const clearRequestParam = useCallback(() => {
    if (!searchParams.has("request")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("request");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const fetchCredentials = async () => {
    if (!holderDid) return;
    setCredentials(await api.listHolderCredentials(holderDid));
  };

  const fetchPendingRequests = async () => {
    if (!holderDid) return;
    const all = await api.listRequests({ holderDid });
    setPendingRequests(all.filter((r) => r.status === "pending"));
    setHistory(all.filter((r) => r.status !== "pending"));
  };

  const fetchActivity = async () => {
    if (!holderDid) return;
    try {
      setActivity(await product.listEvents(holderDid));
    } catch {
      setActivity([]);
    }
  };

  const openFromDeepLink = async (requestId: string) => {
    try {
      const req = await api.getRequest(requestId);
      if (req.status === "pending") {
        setActiveRequest(req);
        setStage("idle");
        setShowProofModal(true);
        return;
      }
      toast.message("This request was already submitted", {
        description: `Request #${req.id} is ${req.status}.`,
      });
      clearRequestParam();
    } catch {
      toast.error("Request not found", {
        description: "This verification link is invalid or expired.",
      });
      clearRequestParam();
    }
  };

  useEffect(() => {
    if (!holderDid) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading before async wallet fetch
    setIsLoadingData(true);
    Promise.all([fetchCredentials(), fetchPendingRequests(), fetchActivity()])
      .then(async () => {
        if (cancelled || !requestIdParam) return;
        await openFromDeepLink(requestIdParam);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, requestIdParam, holderDid]);

  const pickCredential = () => {
    if (!activeRequest) return credentials[0];
    if (activeRequest.issuer_did) {
      return (
        credentials.find(
          (c) => c.issuer_did === activeRequest.issuer_did && c.status === "Active"
        ) || credentials[0]
      );
    }
    return credentials.find((c) => c.status === "Active") || credentials[0];
  };

  const handleGenerateAndSubmit = async () => {
    const cred = pickCredential();
    const c = cred?.credential?.trustverseCommitment;
    if (!cred || !c || !activeRequest) return;
    try {
      const threshold = String(activeRequest.threshold);

      const predicate = activeRequest.predicate || "cgpa_gte";
      const params = {
        threshold: Number(activeRequest.threshold_display ?? activeRequest.threshold / 100),
        ...(activeRequest.predicate_params as Record<string, unknown> | undefined),
      };
      const local = evaluateLocalPredicate(
        predicate,
        params,
        cred.credential?.credentialSubject,
        cred.issuer_did,
        cred.status
      );

      setStage("claim");
      const claimBundle = await proofs.proveClaim({
        credentialRoot: c.credentialRoot,
        threshold,
        subjectId: c.subjectId,
        cgpaScaled: c.cgpaScaled,
        degreeCode: c.degreeCode,
        issueDate: c.issueDate,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
      });

      setStage("nonrev");
      const revData = await api.getRevocationProof(cred.hash);
      const nonRevBundle = await proofs.proveNonRevocation({
        credentialRoot: c.credentialRoot,
        revocationTreeRoot: revData.root,
        claimsHash: revData.claimsHash,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
        pathElements: revData.pathElements,
      });

      const claimValid =
        mode === "demo" || claimBundle.publicSignals[0] === "1";
      const nonRevValid =
        mode === "demo" || nonRevBundle.publicSignals[0] === "1";
      const revoked = Boolean(revData.revoked) || cred.status !== "Active";

      let pass: boolean;
      let failReason: string | undefined;
      if (mode === "demo") {
        pass = demoWouldPass(cred, Number(activeRequest.threshold)) && local.pass;
        failReason = pass ? undefined : revoked ? "revoked" : local.reason;
      } else {
        pass = claimValid && nonRevValid && !revoked && local.pass;
        if (revoked) failReason = "revoked";
        else if (!claimValid || !local.pass) failReason = local.reason || "threshold_miss";
        else if (!nonRevValid) failReason = "revoked";
      }

      setStage("submitting");
      const claimReceipt = await chain.verifyClaimProof(cred.hash, claimBundle, signer);
      const nonRevReceipt = await chain.verifyNonRevocationProof(
        cred.hash,
        nonRevBundle,
        signer
      );

      await api.submitProof({
        request_id: activeRequest.id,
        credential_hash: cred.hash,
        claim_tx_hash: claimReceipt.hash,
        nonrev_tx_hash: nonRevReceipt.hash,
        block_number: claimReceipt.blockNumber,
        result: pass ? "pass" : "fail",
        fail_reason: failReason,
      });

      await product.createPresentation({
        holder_did: holderDid,
        credential_hash: cred.hash,
        request_id: activeRequest.id,
      });

      setStage("idle");
      setShowProofModal(false);
      setActiveRequest(null);
      clearRequestParam();
      await fetchPendingRequests();
      await fetchActivity();

      toast.success(
        pass
          ? mode === "demo"
            ? "Proofs verified (simulated)"
            : "Proofs verified on-chain"
          : failReasonLabel(failReason),
        {
          description: pass
            ? "The verifier can now see a yes/no result. They did not learn your grades."
            : failReasonLabel(failReason),
        }
      );
    } catch (e) {
      console.error(e);
      setStage("error");
      const err = friendlyError(e, {
        title: "Proof failed",
        description: "Could not generate or submit the proof. Check MetaMask and try again.",
      });
      toast.error(err.title, { description: err.description });
    }
  };

  const closeModal = (open: boolean) => {
    setShowProofModal(open);
    if (!open) {
      setStage("idle");
      setActiveRequest(null);
      clearRequestParam();
    }
  };

  if (!address) {
    return (
      <WalletGate
        icon={<Fingerprint />}
        title="Holder wallet"
        description={
          mode === "demo"
            ? "Pick Alice (active) or Bob (revoked) to view credentials and respond to requests."
            : "Connect MetaMask to view credentials and respond to verification requests."
        }
        suggestedRoles={["holder"]}
      />
    );
  }

  const stageOrder: ProofStage[] = ["claim", "nonrev", "submitting", "done"];
  const stepStateFor = (step: Exclude<ProofStage, "idle" | "error">): ProofStep["state"] => {
    if (stage === "error") return "idle";
    if (stage === step) return "active";
    if (stageOrder.indexOf(stage) > stageOrder.indexOf(step)) return "done";
    return "idle";
  };

  const steps: ProofStep[] = [
    {
      id: "select",
      label: "Select credential",
      state: pickCredential()?.credential ? "done" : "error",
    },
    {
      id: "claim",
      label: `Prove CGPA ≥ ${activeRequest?.threshold_display ?? "threshold"}`,
      state: stepStateFor("claim"),
    },
    {
      id: "nonrev",
      label: "Prove non-revocation",
      state: stepStateFor("nonrev"),
    },
    {
      id: "submit",
      label: mode === "demo" ? "Submit (simulated)" : "Submit on-chain",
      state: stepStateFor("submitting"),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Holder"
        title="Holder wallet"
        description="View your decrypted credentials and respond to verification requests without revealing your data."
      />

      <Dialog open={showProofModal} onOpenChange={closeModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeRequest?.template_label || `Request #${activeRequest?.id}`}
            </DialogTitle>
            <DialogDescription>
              Review what {formatDid(activeRequest?.verifier_did || "")} will learn before you prove.
            </DialogDescription>
          </DialogHeader>

          {activeRequest && (
            <PredicateExplain def={getPredicate(activeRequest.predicate)} />
          )}

          <ProofStepper steps={steps} className="py-1" />

          <Button
            onClick={handleGenerateAndSubmit}
            disabled={isBusy || credentials.length === 0}
            className="w-full"
            size="lg"
          >
            {isBusy && <Loader2 className="size-4 animate-spin" />}
            {stage === "claim"
              ? "Generating claim proof…"
              : stage === "nonrev"
                ? "Generating non-revocation proof…"
                : stage === "submitting"
                  ? mode === "demo"
                    ? "Submitting (simulated)…"
                    : "Submitting on-chain…"
                  : "Approve and prove"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-72 lg:shrink-0">
          <Card className="items-center gap-4 p-6 text-center">
            <QRPanel value={holderDid} size={128} />
            <HashChip value={holderDid} label="Your ID" size="md" className="max-w-full" />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`${basePath}/present`}>
                <QrCode className="size-3.5" />
                Present offline
              </Link>
            </Button>
          </Card>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">Pending requests</h3>
            {isLoadingData ? (
              <Skeleton className="h-16 w-full" />
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              pendingRequests.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRequest(r);
                    setStage("idle");
                    setShowProofModal(true);
                  }}
                  className="w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <p className="text-sm text-foreground">
                    {r.template_label || `CGPA ≥ ${r.threshold_display}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDid(r.verifier_did || "")} · #{r.id}
                  </p>
                </button>
              ))
            )}
          </div>

          {history.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Consent ledger</h3>
              {history.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 text-xs">
                  <p className="font-medium text-foreground">
                    {r.template_label || `Request #${r.id}`} · {r.result || r.status}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDid(r.verifier_did || "")} · you disclosed nothing else
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            Your credentials
          </h2>
          {isLoadingData ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : credentials.length === 0 ? (
            <EmptyState
              icon={<Fingerprint />}
              title="No credentials yet"
              description="When your university issues one, it will appear here. You can also open a claim link from email."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {credentials.map((cred) => {
                const subj = cred.credential?.credentialSubject;
                return (
                  <CredentialCard
                    key={cred.hash}
                    title={subj?.degree || "Academic degree"}
                    subtitle={
                      getPersonaByDid(cred.issuer_did)?.label ??
                      `Issuer ${formatDid(cred.issuer_did)}`
                    }
                    hash={cred.hash}
                    status={cred.status === "Active" ? "active" : "revoked"}
                    fields={[
                      { label: "CGPA", value: subj?.cgpa },
                      { label: "Date", value: subj?.date },
                    ]}
                    commitment={cred.poseidon_commitment}
                    actions={
                      <div className="flex flex-col gap-2">
                        <TechnicalDetails
                          items={[
                            { label: "Credential hash", value: cred.hash },
                            { label: "Commitment", value: cred.poseidon_commitment },
                            { label: "Issuer DID", value: cred.issuer_did },
                          ]}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const share = await product.createShare({
                                holder_did: holderDid,
                                credential_hash: cred.hash,
                                predicate: "graduated",
                                label: subj?.degree,
                                expires_in_hours: 168,
                              });
                              const origin = window.location.origin;
                              await navigator.clipboard.writeText(`${origin}${share.url}`);
                              toast.success("Share link copied", {
                                description: "Expires in 7 days. Revoke anytime from activity.",
                              });
                            }}
                          >
                            <Share2 className="size-3.5" />
                            Share
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const blob = new Blob(
                                [JSON.stringify(cred.credential ?? cred, null, 2)],
                                { type: "application/json" }
                              );
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `credential-${cred.hash.slice(0, 10)}.json`;
                              a.click();
                            }}
                          >
                            <Download className="size-3.5" />
                            Export VC
                          </Button>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}

          {activity.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 font-heading text-lg font-semibold">Activity</h2>
              <div className="flex flex-col gap-2">
                {activity.slice(0, 8).map((ev) => (
                  <p key={ev.id} className="text-sm text-muted-foreground">
                    {ev.event_type} · {ev.timestamp?.slice(0, 16)?.replace("T", " ")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HolderWallet() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground">Loading wallet…</div>
      }
    >
      <HolderWalletInner />
    </Suspense>
  );
}
