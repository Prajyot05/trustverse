"use client";

import {
  FilePlus2,
  Fingerprint,
  LayoutDashboard,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  useServices,
  useIdentity,
  getPersonaByDid,
  type IssuedCredential,
  type IssuerProfile,
} from "@/services";
import { friendlyError } from "@/lib/errors";
import { shortHolderLabel } from "@/lib/format";
import { cn } from "cn";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { StatusBadge } from "@/components/data/status-badge";
import { HashChip } from "@/components/data/hash-chip";
import { StatCard } from "@/components/data/stat-card";
import { CredentialCard } from "@/components/credentials/credential-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type IssuerSection = "overview" | "issue";

const SECTION_OPTIONS: Array<{
  id: IssuerSection;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "overview",
    title: "Overview",
    description: "See who holds credentials you issued, and revoke if needed",
    icon: LayoutDashboard,
  },
  {
    id: "issue",
    title: "Issue credential",
    description: "Create a degree credential and anchor it on-chain",
    icon: FilePlus2,
  },
];

function holderDisplayName(holderDid: string): string {
  return getPersonaByDid(holderDid)?.label ?? shortHolderLabel(holderDid);
}

function RevokeAction({
  hash,
  issuerDid,
  onRevoked,
}: {
  hash: string;
  issuerDid: string;
  onRevoked: () => void;
}) {
  const { api } = useServices();
  const [reason, setReason] = useState("1");
  const [details, setDetails] = useState("Demo revocation");

  const handleRevoke = async () => {
    try {
      await api.revokeCredential({
        issuer_did: issuerDid,
        credential_hash: hash,
        reason_code: parseInt(reason, 10),
        details,
      });
      toast.success("Credential revoked", {
        description: "Merkle root published to the gateway.",
      });
      onRevoked();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Revoke failed";
      toast.error(msg, {
        description: "The credential was not revoked. Check the API and try again.",
      });
      throw e;
    }
  };

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" aria-label="Revoke credential">
          <Trash2 className="size-3.5" />
          Revoke
        </Button>
      }
      title="Revoke credential"
      description="This marks the credential inactive and publishes an updated Merkle root for every verifier."
      confirmLabel="Revoke credential"
      destructive
      onConfirm={handleRevoke}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason-code">Reason code</Label>
          <Input
            id="reason-code"
            type="number"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="1 = administrative"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason-details">Details</Label>
          <Input
            id="reason-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}

export function IssuerPortal() {
  const { mode, api, chain } = useServices();
  const { address, did, signer } = useIdentity();
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [section, setSection] = useState<IssuerSection>("overview");
  const [issuerProfile, setIssuerProfile] = useState<IssuerProfile | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
  const [institutionName, setInstitutionName] = useState("TrustVerse University");

  const [formData, setFormData] = useState({
    holderDid: "",
    degreeName: "",
    graduationDate: "",
    cgpa: "",
  });

  const issuerDid = did ?? "";

  const fetchCredentials = async () => {
    if (!issuerDid) return;
    try {
      setCredentials(await api.listIssuerCredentials(issuerDid));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    if (!issuerDid) return;
    try {
      setIssuerProfile(await api.getIssuer(issuerDid));
    } catch {
      setIssuerProfile(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading before the async fetch below settles
    setIsLoadingData(true);
    Promise.all([fetchCredentials(), fetchProfile()]).finally(() =>
      setIsLoadingData(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleRegister = async () => {
    if (!address || !issuerDid) return;
    setIsRegistering(true);
    try {
      await chain.registerIssuer(
        issuerDid,
        `ipfs://trustverse/${address.slice(2, 10)}`,
        signer
      );
      await api.registerIssuer({
        did: issuerDid,
        wallet_address: address,
        name: institutionName,
        metadata_json: { type: "university" },
      });
      await fetchProfile();
      toast.success("Issuer registered", {
        description:
          mode === "demo"
            ? "Registered in the demo ledger."
            : "Registered on-chain and in the TrustVerse API.",
      });
    } catch (e) {
      console.error(e);
      const err = friendlyError(e, {
        title: "Registration failed",
        description: "Could not register this issuer. Check MetaMask and try again.",
      });
      toast.error(err.title, { description: err.description });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !issuerDid) return;
    setIsIssuing(true);
    try {
      const issued = await api.issueCredential({
        issuer_did: issuerDid,
        holder_did: formData.holderDid,
        schema_id: "degree-v1",
        credential_subject: {
          degree: formData.degreeName,
          date: formData.graduationDate,
          cgpa: parseFloat(formData.cgpa),
        },
        issuer_wallet_address: address,
      });

      const receipt = await chain.anchorCredential(
        issued.credential_hash,
        issued.poseidon_commitment,
        issuerDid,
        signer
      );

      await api.markAnchored(issued.credential_hash, receipt.hash);

      toast.success("Credential issued and anchored", {
        description:
          mode === "demo"
            ? `Simulated tx confirmed in block ${receipt.blockNumber}.`
            : `Confirmed in block ${receipt.blockNumber}.`,
      });
      setFormData({ holderDid: "", degreeName: "", graduationDate: "", cgpa: "" });
      fetchCredentials();
    } catch (e) {
      console.error(e);
      const err = friendlyError(e, {
        title: "Issue failed",
        description: "Could not issue or anchor this credential. Check MetaMask and try again.",
      });
      toast.error(err.title, { description: err.description });
    } finally {
      setIsIssuing(false);
    }
  };

  if (!address) {
    return (
      <WalletGate
        icon={<Fingerprint />}
        title="Issuer portal"
        description={
          mode === "demo"
            ? "Pick TrustVerse University to register and issue credentials."
            : "Connect MetaMask to register and issue credentials."
        }
        suggestedRoles={["issuer"]}
      />
    );
  }

  const activeCount = credentials.filter((c) => c.status === "Active").length;
  const revokedCount = credentials.filter((c) => c.status !== "Active").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Issuer"
        title="Issuer portal"
        description="Register your institution once, then issue and manage verifiable credentials."
        actions={
          issuerProfile ? (
            <StatusBadge status="registered" label={`Registered · ${issuerProfile.name}`} />
          ) : (
            <StatusBadge status="unregistered" />
          )
        }
      />

      <Card className="mt-6 gap-3 border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Your Issuer DID</p>
          <p className="text-sm text-muted-foreground">
            This is the public identity verifiers check when they trust a credential from you.
          </p>
          <HashChip
            value={issuerDid}
            label="DID"
            size="md"
            start={12}
            end={8}
            className="max-w-full"
          />
        </div>
        {issuerProfile?.name && (
          <div className="shrink-0 rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Institution
            </p>
            <p className="mt-0.5 font-heading text-base font-semibold text-foreground">
              {issuerProfile.name}
            </p>
          </div>
        )}
      </Card>

      {!issuerProfile && (
        <Card className="mt-6 flex flex-col gap-4 border-border bg-muted/40 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium text-foreground">
                Register your institution to start issuing
              </p>
              <p className="text-sm text-muted-foreground">
                {mode === "demo"
                  ? "Simulate on-chain registration, then you can issue credentials."
                  : "Sign one MetaMask transaction to register on-chain, then you can issue credentials."}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-64">
            <Input
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Institution name"
              aria-label="Institution name"
            />
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering && <Loader2 className="size-4 animate-spin" />}
              {mode === "demo" ? "Register (simulated)" : "Register on-chain"}
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-8 flex flex-col gap-6">
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">What do you want to do?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="tablist" aria-label="Issuer sections">
            {SECTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = section === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSection(option.id)}
                  className={cn(
                    "group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary group-hover:bg-primary/15"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-heading text-base font-semibold text-foreground">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {section === "overview" ? (
          <div className="flex flex-col gap-6" role="tabpanel">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Issued" value={credentials.length} hint="Total credentials created" />
              <StatCard label="Active" value={activeCount} hint="Still valid for verification" />
              <StatCard label="Revoked" value={revokedCount} hint="No longer accepted" />
            </div>

            <div>
              <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">
                Issued credentials
              </h2>
              <div className="flex flex-col gap-3">
                {isLoadingData ? (
                  <>
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </>
                ) : credentials.length === 0 ? (
                  <EmptyState
                    title="No credentials issued yet"
                    description="Choose Issue credential above to create your first verifiable credential."
                  />
                ) : (
                  credentials.map((cred) => {
                    const subject = cred.credential?.credentialSubject;
                    const holderName = holderDisplayName(cred.holder_did);
                    const degree = subject?.degree || "Academic credential";
                    const details = [
                      `Issued to ${holderName}`,
                      subject?.cgpa != null ? `CGPA ${subject.cgpa}` : null,
                      subject?.date ? `Graduated ${subject.date}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <CredentialCard
                        key={cred.hash}
                        variant="row"
                        title={degree}
                        subtitle={details}
                        hash={cred.hash}
                        status={cred.status === "Active" ? "active" : "revoked"}
                        meta={[
                          { label: "Holder DID", value: cred.holder_did },
                          { label: "Credential hash", value: cred.hash },
                        ]}
                        actions={
                          cred.status === "Active" ? (
                            <RevokeAction
                              hash={cred.hash}
                              issuerDid={issuerDid}
                              onRevoked={fetchCredentials}
                            />
                          ) : undefined
                        }
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <Card className="max-w-xl gap-5 p-6 sm:p-8" role="tabpanel">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Issue &amp; anchor credential
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Enter the holder&apos;s DID and degree details. TrustVerse creates a W3C
                verifiable credential, then anchors its commitment
                {mode === "demo" ? " (simulated)." : " via MetaMask."}
              </p>
            </div>
            <form onSubmit={handleIssue} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="holder-did" className="text-sm">
                  Holder DID
                </Label>
                <p className="text-sm text-muted-foreground">
                  Who receives this credential? Paste their decentralized identifier.
                </p>
                <Input
                  id="holder-did"
                  required
                  placeholder="did:ethr:0x..."
                  value={formData.holderDid}
                  onChange={(e) => setFormData({ ...formData, holderDid: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="degree-name" className="text-sm">
                  Degree name
                </Label>
                <Input
                  id="degree-name"
                  required
                  placeholder="B.Sc Computer Science"
                  value={formData.degreeName}
                  onChange={(e) => setFormData({ ...formData, degreeName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="graduation-date" className="text-sm">
                    Graduation date
                  </Label>
                  <Input
                    id="graduation-date"
                    required
                    type="date"
                    value={formData.graduationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, graduationDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cgpa" className="text-sm">
                    CGPA
                  </Label>
                  <Input
                    id="cgpa"
                    required
                    type="number"
                    step="0.01"
                    placeholder="8.90"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  />
                </div>
              </div>
              {!issuerProfile && (
                <p className="text-sm text-warning">
                  Register your institution above before issuing credentials.
                </p>
              )}
              <Button type="submit" disabled={isIssuing || !issuerProfile} size="lg">
                {isIssuing && <Loader2 className="size-4 animate-spin" />}
                {mode === "demo" ? "Anchor credential (simulated)" : "Sign anchor in MetaMask"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
