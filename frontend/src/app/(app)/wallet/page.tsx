"use client";
import { useWallet } from "@/store/useWallet";
import { Fingerprint, Loader2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import * as snarkjs from "snarkjs";
import { Contract } from "ethers";
import { toast } from "sonner";
import {
  API_URL,
  ADDRESSES,
  GATEWAY_ABI,
  didFromAddress,
  toBytes32,
  groth16ToSolidity,
} from "@/lib/contracts";
import { friendlyError } from "@/lib/errors";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { QRPanel } from "@/components/data/qr-panel";
import { HashChip } from "@/components/data/hash-chip";
import { CredentialCard } from "@/components/credentials/credential-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ProofStepper, type ProofStep } from "@/components/proof/proof-stepper";
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

interface VerifyRequest {
  id: number | string;
  status: string;
  threshold: number;
  threshold_display: string;
  issuer_did?: string;
  holder_did?: string;
}

interface TrustverseCommitment {
  credentialRoot: string;
  subjectId: string;
  cgpaScaled: string;
  degreeCode: string;
  issueDate: string;
  issuerPubKey: string;
  salt: string;
  schemaId: string;
}

interface HolderCredential {
  hash: string;
  issuer_did: string;
  status: string;
  on_chain?: { status?: string };
  on_chain_revoked?: boolean;
  poseidon_commitment?: string;
  credential?: {
    credentialSubject?: { degree?: string; cgpa?: number | string; date?: string };
    trustverseCommitment?: TrustverseCommitment;
  };
}

function WalletInner() {
  const { address, signer } = useWallet();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get("request");

  const [showProofModal, setShowProofModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<VerifyRequest | null>(null);
  const [stage, setStage] = useState<ProofStage>("idle");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [credentials, setCredentials] = useState<HolderCredential[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VerifyRequest[]>([]);

  const holderDid = address ? didFromAddress(address) : "";
  const isBusy = stage === "claim" || stage === "nonrev" || stage === "submitting";

  const fetchCredentials = async () => {
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/credentials/holder/${encodeURIComponent(holderDid)}`);
    if (res.ok) setCredentials(await res.json());
  };

  const fetchRequests = async () => {
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/verify/requests?holder_did=${encodeURIComponent(holderDid)}`);
    if (res.ok) {
      const all: VerifyRequest[] = await res.json();
      setPendingRequests(all.filter((r) => r.status === "pending"));
      if (requestIdParam) {
        const req = all.find((r) => String(r.id) === requestIdParam);
        if (req) {
          setActiveRequest(req);
          setShowProofModal(true);
        }
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading before the async fetch below settles
    setIsLoadingData(true);
    Promise.all([fetchCredentials(), fetchRequests()]).finally(() =>
      setIsLoadingData(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, requestIdParam]);

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
    if (!cred || !c || !signer || !activeRequest) return;
    try {
      const threshold = String(activeRequest.threshold);

      setStage("claim");
      const claimInput = {
        credentialRoot: c.credentialRoot,
        threshold,
        subjectId: c.subjectId,
        cgpaScaled: c.cgpaScaled,
        degreeCode: c.degreeCode,
        issueDate: c.issueDate,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
      };
      const { proof: claimProof, publicSignals: claimSignals } = await snarkjs.groth16.fullProve(
        claimInput,
        "/circuits/ClaimProver.wasm",
        "/circuits/ClaimProver_final.zkey"
      );

      setStage("nonrev");
      const revRes = await fetch(`${API_URL}/api/v1/credentials/revocation/proof/${cred.hash}`);
      if (!revRes.ok) throw new Error("Could not fetch revocation Merkle path");
      const revData = await revRes.json();

      const nonRevInput = {
        credentialRoot: c.credentialRoot,
        revocationTreeRoot: revData.root,
        claimsHash: revData.claimsHash,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
        pathElements: revData.pathElements,
      };
      const { proof: nonRevProof, publicSignals: nonRevSignals } = await snarkjs.groth16.fullProve(
        nonRevInput,
        "/circuits/NonRevocation.wasm",
        "/circuits/NonRevocation_final.zkey"
      );

      setStage("submitting");
      const gateway = new Contract(ADDRESSES.verificationGateway, GATEWAY_ABI, signer);
      const credHash = toBytes32(cred.hash);
      const claimCalldata = groth16ToSolidity(claimProof, claimSignals);
      const nonRevCalldata = groth16ToSolidity(nonRevProof, nonRevSignals);

      const claimTx = await gateway.verifyClaimProof(
        credHash,
        claimCalldata.pA,
        claimCalldata.pB,
        claimCalldata.pC,
        claimCalldata.pubSignals
      );
      const claimReceipt = await claimTx.wait();

      const nonRevTx = await gateway.verifyNonRevocationProof(
        credHash,
        nonRevCalldata.pA,
        nonRevCalldata.pB,
        nonRevCalldata.pC,
        nonRevCalldata.pubSignals
      );
      const nonRevReceipt = await nonRevTx.wait();

      await fetch(`${API_URL}/api/v1/verify/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: activeRequest.id,
          credential_hash: cred.hash,
          claim_tx_hash: claimReceipt.hash,
          nonrev_tx_hash: nonRevReceipt.hash,
          block_number: claimReceipt.blockNumber,
          result: "pass",
        }),
      });

      setStage("done");
      toast.success("Proofs verified on-chain", {
        description: "The verifier can now see the result.",
      });
      setShowProofModal(false);
      fetchRequests();
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
    if (!open) setStage("idle");
  };

  if (!address) {
    return (
      <WalletGate
        icon={<Fingerprint />}
        title="Holder wallet"
        description="Connect MetaMask to view credentials and respond to verification requests."
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
      label: "Submit on-chain",
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verification request #{activeRequest?.id}</DialogTitle>
            <DialogDescription>
              Prove CGPA ≥ {activeRequest?.threshold_display} without revealing your transcript.
            </DialogDescription>
          </DialogHeader>

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
                  ? "Submitting on-chain…"
                  : "Generate & submit proofs"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-72 lg:shrink-0">
          <Card className="items-center gap-4 p-6 text-center">
            <QRPanel value={holderDid} size={128} />
            <HashChip value={holderDid} label="did" className="max-w-full" />
          </Card>

          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Pending requests
            </h3>
            {isLoadingData ? (
              <Skeleton className="h-16 w-full" />
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              pendingRequests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRequest(r);
                    setStage("idle");
                    setShowProofModal(true);
                  }}
                  className="w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <p className="text-sm text-foreground">CGPA ≥ {r.threshold_display}</p>
                  <p className="text-xs text-muted-foreground">Request #{r.id}</p>
                </button>
              ))
            )}
          </div>
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
              description={`Ask your university to issue one to ${holderDid}.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {credentials.map((cred) => {
                const subj = cred.credential?.credentialSubject;
                return (
                  <CredentialCard
                    key={cred.hash}
                    title={subj?.degree || "Academic degree"}
                    subtitle={cred.issuer_did}
                    hash={cred.hash}
                    status={cred.status === "Active" ? "active" : "revoked"}
                    fields={[
                      { label: "CGPA", value: subj?.cgpa },
                      { label: "Date", value: subj?.date },
                      { label: "On-chain", value: cred.on_chain?.status ?? "unknown" },
                      {
                        label: "Revoked (chain)",
                        value: cred.on_chain_revoked ? "yes" : "no",
                      },
                    ]}
                    commitment={cred.poseidon_commitment}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground">Loading wallet…</div>
      }
    >
      <WalletInner />
    </Suspense>
  );
}
