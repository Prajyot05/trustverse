"use client";

import { CheckCircle, Loader2, ScanSearch, UploadCloud } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useServices,
  useIdentity,
  type AnalysisResult,
  type PollStatus,
  type TrustScoreResult,
  type VerifyRequestSummary,
} from "@/services";
import { friendlyError } from "@/lib/errors";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { HashChip } from "@/components/data/hash-chip";
import { QRPanel } from "@/components/data/qr-panel";
import { DataField } from "@/components/data/data-field";
import { EmptyState } from "@/components/feedback/empty-state";
import { TrustScoreRing } from "@/components/forensics/trust-score-ring";
import { ScoreBreakdown } from "@/components/forensics/score-breakdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function VerifierDashboard() {
  const { mode, api, basePath } = useServices();
  const { address, did } = useIdentity();
  const [threshold, setThreshold] = useState("8.0");
  const [holderDid, setHolderDid] = useState("");
  const [issuerDid, setIssuerDid] = useState("");
  const [request, setRequest] = useState<VerifyRequestSummary | null>(null);
  const [pollStatus, setPollStatus] = useState<PollStatus | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScoreResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request?.id) return;
    const id = setInterval(async () => {
      try {
        setPollStatus(await api.getRequest(request.id));
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [request?.id, api]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!did) return;
    try {
      const created = await api.createRequest({
        verifier_did: did,
        holder_did: holderDid || undefined,
        issuer_did: issuerDid || undefined,
        attribute: "cgpa",
        threshold: parseFloat(threshold),
      });
      setRequest(created);
      setPollStatus(null);
      toast.success("Request created", {
        description: "Share the QR code or deep link with the holder.",
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      toast.error("Could not create request", {
        description: detail ?? "Check the backend is running and try again.",
      });
    }
  };

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setAnalysisResult(null);
    setTrustScore(null);
  };

  const runAIForensics = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const result = await api.analyzeForensics(selectedFile);
      setAnalysisResult(result);
      try {
        const ts = await api.computeTrustScore(
          "0x0",
          result.analysis.authenticity_score
        );
        setTrustScore(ts);
      } catch {
        /* trust score optional */
      }
    } catch (e) {
      console.error(e);
      const err = friendlyError(e, {
        title: "Forensics failed",
        description:
          mode === "demo"
            ? "Could not analyze the image in demo mode."
            : "Ensure the backend is running and CNN weights are trained.",
      });
      toast.error(err.title, { description: err.description });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!address) {
    return (
      <WalletGate
        icon={<ScanSearch />}
        title="Verifier portal"
        description={
          mode === "demo"
            ? "Pick Acme Corp to request ZK proofs or run AI forensics."
            : "Connect wallet to request ZK proofs or run AI forensics."
        }
        suggestedRoles={["verifier"]}
      />
    );
  }

  const deepLink = request
    ? request.wallet_deep_link.startsWith("http")
      ? request.wallet_deep_link
      : `${typeof window !== "undefined" ? window.location.origin : ""}${
          request.wallet_deep_link.startsWith(basePath)
            ? request.wallet_deep_link
            : `${basePath}${request.wallet_deep_link}`
        }`
    : "";
  const isFulfilled = pollStatus?.status === "fulfilled";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Verifier"
        title="Verifier dashboard"
        description="Request threshold proofs verified on-chain, or run AI forensics on legacy scans."
      />

      <Tabs defaultValue="zk" className="mt-8">
        <TabsList>
          <TabsTrigger value="zk">Zero-knowledge</TabsTrigger>
          <TabsTrigger value="ai">AI forensics</TabsTrigger>
        </TabsList>

        <TabsContent value="zk" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="gap-4 p-6 sm:p-8">
              <div className="px-6 sm:px-8">
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Proof request
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Request a threshold check without ever seeing the underlying value.
                </p>
              </div>
              <form onSubmit={handleCreateRequest} className="flex flex-col gap-4 px-6 sm:px-8">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holder-did">Holder DID (optional)</Label>
                  <Input
                    id="holder-did"
                    placeholder="did:ethr:0x..."
                    value={holderDid}
                    onChange={(e) => setHolderDid(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issuer-did">Issuer DID (optional)</Label>
                  <Input
                    id="issuer-did"
                    placeholder="did:ethr:0x..."
                    value={issuerDid}
                    onChange={(e) => setIssuerDid(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="threshold">CGPA ≥</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg">
                  Create request
                </Button>
              </form>
            </Card>

            <Card className="min-h-[360px] items-center justify-center gap-4 p-6 text-center sm:p-8">
              {request ? (
                <div className="flex w-full flex-col items-center gap-4 px-6 sm:px-8">
                  <p className="text-sm text-muted-foreground">
                    Request #{request.id} — share with holder
                  </p>
                  <QRPanel value={deepLink} size={168} />
                  <HashChip value={deepLink} copyable label="Link" className="max-w-full" />

                  {isFulfilled ? (
                    <Alert variant="success" className="w-full text-left">
                      <CheckCircle />
                      <AlertTitle>Verified</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <DataField label="Block" value={pollStatus.block_number} mono />
                          <DataField
                            label="Claim tx"
                            value={
                              <HashChip
                                value={pollStatus.claim_tx_hash ?? ""}
                                copyable={false}
                              />
                            }
                          />
                        </div>
                        <p className="mt-3 border-t border-border pt-3 text-foreground/80">
                          No attribute values were disclosed — only that the threshold
                          holds and the credential is not revoked.
                        </p>
                      </AlertDescription>
                    </Alert>
                  ) : pollStatus?.status === "failed" ? (
                    <Alert variant="destructive" className="w-full text-left">
                      <AlertTitle>Not verified</AlertTitle>
                      <AlertDescription>
                        The holder submitted a proof that did not meet the threshold
                        or used a revoked credential.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="size-4 animate-spin" />
                      Waiting for holder proof…
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={<ScanSearch />}
                  title="No active request"
                  description="Create a request to get a wallet deep link and QR code."
                />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <Card className="gap-6 p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-8 px-6 sm:px-8 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Label htmlFor="scan-upload">Legacy scan</Label>
                <label
                  htmlFor="scan-upload"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <input
                    id="scan-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <UploadCloud className="size-9 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    {selectedFile?.name || "Choose or drop a scanned certificate"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG — analyzed with ELA + a trained CNN
                    {mode === "demo" ? " (simulated)" : ""}
                  </p>
                </label>
                {selectedFile && !analysisResult && (
                  <Button type="button" onClick={runAIForensics} disabled={isAnalyzing}>
                    {isAnalyzing && <Loader2 className="size-4 animate-spin" />}
                    Run forensics
                  </Button>
                )}
              </div>

              <div className="flex flex-col justify-center">
                {analysisResult ? (
                  <div className="flex flex-col gap-5">
                    <Alert
                      variant={
                        analysisResult.analysis.is_authentic ? "success" : "destructive"
                      }
                    >
                      <AlertTitle>
                        {analysisResult.analysis.is_authentic
                          ? "Likely authentic"
                          : "Forgery suspected"}
                      </AlertTitle>
                      <AlertDescription>
                        Score: {(analysisResult.analysis.authenticity_score * 100).toFixed(1)}%
                      </AlertDescription>
                    </Alert>

                    {analysisResult.analysis.ela_heatmap && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={analysisResult.analysis.ela_heatmap}
                        alt="Error level analysis heatmap highlighting potential tampering regions"
                        className="w-full rounded-lg border border-border"
                      />
                    )}

                    <HashChip
                      value={analysisResult.analysis.phash}
                      label="pHash"
                      copyable={false}
                      className="w-full justify-start"
                    />

                    {trustScore && (
                      <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-6">
                        <TrustScoreRing score={trustScore.score} />
                        {trustScore.components && (
                          <ScoreBreakdown
                            className="flex-1"
                            components={[
                              {
                                label: "AI authenticity",
                                points: trustScore.components.ai_points,
                              },
                              {
                                label: "Issuer reputation",
                                points: trustScore.components.issuer_points,
                              },
                              {
                                label: "On-chain anchor",
                                points: trustScore.components.onchain_points,
                              },
                              {
                                label: "Lineage",
                                points: trustScore.components.lineage_points,
                              },
                            ]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No scan analyzed yet"
                    description="Upload a scanned certificate to run ELA and CNN forensics."
                  />
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
