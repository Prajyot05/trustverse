"use client";

import { CheckCircle, Loader2, ScanSearch, UploadCloud } from "lucide-react";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  useServices,
  useIdentity,
  type AnalysisResult,
  type TrustScoreResult,
  type VerifyRequest,
} from "@/services";
import { friendlyError } from "@/lib/errors";
import { cn } from "cn";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { HashChip } from "@/components/data/hash-chip";
import { QRPanel } from "@/components/data/qr-panel";
import { DataField } from "@/components/data/data-field";
import { StatusBadge, type StatusKind } from "@/components/data/status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { TrustScoreRing } from "@/components/forensics/trust-score-ring";
import { ScoreBreakdown } from "@/components/forensics/score-breakdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function requestStatusKind(status: string): StatusKind {
  if (status === "fulfilled") return "fulfilled";
  if (status === "failed") return "failed";
  if (status === "pending") return "pending";
  return "neutral";
}

function VerifierDashboardInner() {
  const { mode, api, basePath } = useServices();
  const { address, did } = useIdentity();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get("request");

  const [threshold, setThreshold] = useState("8.0");
  const [holderDid, setHolderDid] = useState("");
  const [issuerDid, setIssuerDid] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [history, setHistory] = useState<VerifyRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(requestIdParam);
  const [selected, setSelected] = useState<VerifyRequest | null>(null);
  const [pollError, setPollError] = useState(false);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScoreResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastedTerminalRef = useRef<Set<string>>(new Set());
  const knownPendingRef = useRef<Set<string>>(new Set());

  const selectRequest = useCallback(
    (id: string | number | null, replace = false) => {
      const next = id == null ? null : String(id);
      setSelectedId(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("request", next);
      else params.delete("request");
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const loadHistory = useCallback(async (): Promise<VerifyRequest[]> => {
    if (!did) return [];
    try {
      const rows = await api.listRequests({ verifierDid: did });
      setHistory(rows);
      return rows;
    } catch {
      setHistory([]);
      return [];
    }
  }, [api, did]);

  useEffect(() => {
    if (!did) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading before async history fetch
    setIsLoadingHistory(true);
    loadHistory()
      .then((rows) => {
        if (cancelled) return;
        const param = requestIdParam;
        if (param) {
          const match = rows.find((r) => String(r.id) === param);
          if (match) {
            setSelected(match);
            setSelectedId(param);
            return;
          }
        }
        if (rows.length > 0 && !param) {
          const first = rows[0];
          setSelected(first);
          setSelectedId(String(first.id));
          selectRequest(first.id, true);
        } else if (!param) {
          setSelected(null);
          setSelectedId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [did, address]);

  useEffect(() => {
    if (requestIdParam) setSelectedId(requestIdParam);
  }, [requestIdParam]);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return null;
    try {
      const latest = await api.getRequest(selectedId);
      setSelected(latest);
      setPollError(false);
      setPollErrorCount(0);
      setHistory((prev) => {
        const idx = prev.findIndex((r) => String(r.id) === String(latest.id));
        if (idx === -1) return [latest, ...prev];
        const next = [...prev];
        next[idx] = latest;
        return next;
      });

      const key = String(latest.id);
      if (latest.status === "pending") {
        knownPendingRef.current.add(key);
      } else if (
        (latest.status === "fulfilled" || latest.status === "failed") &&
        knownPendingRef.current.has(key) &&
        !toastedTerminalRef.current.has(key)
      ) {
        toastedTerminalRef.current.add(key);
        knownPendingRef.current.delete(key);
        if (latest.status === "fulfilled") {
          toast.success("Proof received", {
            description: `Request #${latest.id} was verified.`,
          });
        } else {
          toast.error("Proof did not verify", {
            description: `Request #${latest.id} failed the threshold check.`,
          });
        }
      }
      return latest;
    } catch {
      setPollErrorCount((c) => {
        const next = c + 1;
        if (next >= 2) setPollError(true);
        return next;
      });
      return null;
    }
  }, [api, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      const latest = await refreshSelected();
      if (cancelled) return;
      if (latest?.status === "pending") {
        intervalId = setInterval(() => {
          void refreshSelected().then((row) => {
            if (row && row.status !== "pending" && intervalId) {
              clearInterval(intervalId);
            }
          });
        }, 3000);
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedId, refreshSelected]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!did) return;
    if (!holderDid.trim()) {
      toast.error("Holder DID required", {
        description: "Needed so the request appears in their wallet.",
      });
      return;
    }
    setIsCreating(true);
    try {
      const created = await api.createRequest({
        verifier_did: did,
        holder_did: holderDid.trim(),
        issuer_did: issuerDid.trim() || undefined,
        attribute: "cgpa",
        threshold: parseFloat(threshold),
      });
      toastedTerminalRef.current.delete(String(created.id));
      await loadHistory();
      selectRequest(created.id, true);
      setSelected({
        id: created.id,
        wallet_deep_link: created.wallet_deep_link,
        status: "pending",
        threshold: Math.round(parseFloat(threshold) * 100),
        threshold_display: parseFloat(threshold),
        holder_did: holderDid.trim(),
        issuer_did: issuerDid.trim() || undefined,
        verifier_did: did,
      });
      setSelectedId(String(created.id));
      setPollError(false);
      setPollErrorCount(0);
      toast.success("Request created", {
        description: "Share the QR code or deep link with the holder. You can leave this page anytime.",
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      toast.error("Could not create request", {
        description: detail ?? "Check the backend is running and try again.",
      });
    } finally {
      setIsCreating(false);
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

  const deepLink = selected?.wallet_deep_link
    ? selected.wallet_deep_link.startsWith("http")
      ? selected.wallet_deep_link
      : `${typeof window !== "undefined" ? window.location.origin : ""}${
          selected.wallet_deep_link.startsWith(basePath)
            ? selected.wallet_deep_link
            : `${basePath}${selected.wallet_deep_link}`
        }`
    : "";
  const isFulfilled = selected?.status === "fulfilled";
  const isFailed = selected?.status === "failed";
  const isPending = selected?.status === "pending";

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

        <TabsContent value="zk" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="gap-4 p-6 sm:p-8">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Proof request
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Request a threshold check without ever seeing the underlying value.
                </p>
              </div>
              <form onSubmit={handleCreateRequest} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holder-did">Holder DID</Label>
                  <p className="text-sm text-muted-foreground">
                    Needed so the request appears in their wallet.
                  </p>
                  <Input
                    id="holder-did"
                    required
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
                <Button type="submit" size="lg" disabled={isCreating}>
                  {isCreating && <Loader2 className="size-4 animate-spin" />}
                  Create request
                </Button>
              </form>
            </Card>

            <Card className="min-h-[360px] items-center justify-center gap-4 p-6 text-center sm:p-8">
              {selected ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <div className="flex w-full flex-wrap items-center justify-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Request #{selected.id} — share with holder
                    </p>
                    <StatusBadge status={requestStatusKind(selected.status)} />
                  </div>
                  {isPending && (
                    <p className="text-sm text-muted-foreground">
                      You can leave this page — reopen this request from history anytime.
                    </p>
                  )}
                  <QRPanel value={deepLink} size={168} />
                  <HashChip value={deepLink} copyable label="Link" className="max-w-full" />

                  {isFulfilled ? (
                    <Alert variant="success" className="w-full text-left">
                      <CheckCircle />
                      <AlertTitle>Verified</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <DataField label="Block" value={selected.block_number} mono />
                          <DataField
                            label="Claim tx"
                            value={
                              <HashChip
                                value={selected.claim_tx_hash ?? ""}
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
                  ) : isFailed ? (
                    <Alert variant="destructive" className="w-full text-left">
                      <AlertTitle>Not verified</AlertTitle>
                      <AlertDescription>
                        The holder submitted a proof that did not meet the threshold
                        or used a revoked credential.
                      </AlertDescription>
                    </Alert>
                  ) : pollError ? (
                    <div className="flex w-full flex-col items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        Couldn&apos;t refresh status. Check your connection and try again.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPollError(false);
                          setPollErrorCount(0);
                          void refreshSelected();
                        }}
                      >
                        Retry
                      </Button>
                    </div>
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

          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Request history
            </h2>
            {isLoadingHistory ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                title="No requests yet"
                description="Created requests stay here so you can leave and come back."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((row) => {
                  const active = String(row.id) === selectedId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelected(row);
                        selectRequest(row.id);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Request #{row.id} · CGPA ≥ {row.threshold_display}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          Holder: {row.holder_did || "—"}
                        </p>
                      </div>
                      <StatusBadge status={requestStatusKind(row.status)} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <Card className="gap-6 p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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

export function VerifierDashboard() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground">Loading verifier…</div>
      }
    >
      <VerifierDashboardInner />
    </Suspense>
  );
}
