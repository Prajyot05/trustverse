"use client";
import { useWallet } from "@/store/useWallet";
import {
  Fingerprint,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import { toast } from "sonner";
import {
  API_URL,
  ADDRESSES,
  ISSUER_REGISTRY_ABI,
  ANCHOR_ABI,
  didFromAddress,
  toBytes32,
} from "@/lib/contracts";
import { friendlyError } from "@/lib/errors";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface IssuedCredential {
  hash: string;
  holder_did: string;
  status: "Active" | "Revoked" | string;
  on_chain?: { status?: string };
}

interface IssuerProfile {
  name: string;
  did?: string;
  wallet_address?: string;
}

function RevokeAction({ hash, onRevoked }: { hash: string; onRevoked: () => void }) {
  const { address } = useWallet();
  const [reason, setReason] = useState("1");
  const [details, setDetails] = useState("Demo revocation");

  const handleRevoke = async () => {
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/credentials/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issuer_did: didFromAddress(address),
        credential_hash: hash,
        reason_code: parseInt(reason, 10),
        details,
      }),
    });
    if (res.ok) {
      toast.success("Credential revoked", {
        description: "Merkle root published to the gateway.",
      });
      onRevoked();
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(typeof body.detail === "string" ? body.detail : "Revoke failed", {
        description: "The credential was not revoked. Check the API and try again.",
      });
      throw new Error("revoke failed");
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

export default function IssuerPortal() {
  const { address, signer } = useWallet();
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [issuerProfile, setIssuerProfile] = useState<IssuerProfile | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
  const [institutionName, setInstitutionName] = useState("TrustVerse University");

  const [formData, setFormData] = useState({
    holderDid: "",
    degreeName: "",
    graduationDate: "",
    cgpa: "",
  });

  const issuerDid = address ? didFromAddress(address) : "";

  const fetchCredentials = async () => {
    if (!address) return;
    try {
      const res = await fetch(
        `${API_URL}/api/v1/credentials/issuer/${encodeURIComponent(issuerDid)}`
      );
      if (res.ok) setCredentials(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/issuers/${encodeURIComponent(issuerDid)}`);
      if (res.ok) setIssuerProfile(await res.json());
      else setIssuerProfile(null);
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
    if (!signer || !address) return;
    setIsRegistering(true);
    try {
      if (!ADDRESSES.issuerRegistry) throw new Error("Contract addresses not configured");

      const registry = new Contract(ADDRESSES.issuerRegistry, ISSUER_REGISTRY_ABI, signer);
      const tx = await registry.selfRegister(issuerDid, `ipfs://trustverse/${address.slice(2, 10)}`);
      await tx.wait();

      await fetch(`${API_URL}/api/v1/issuers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did: issuerDid,
          wallet_address: address,
          name: institutionName,
          metadata_json: { type: "university" },
        }),
      });

      await fetchProfile();
      toast.success("Issuer registered", {
        description: "Registered on-chain and in the TrustVerse API.",
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
    if (!signer || !address) return;
    setIsIssuing(true);
    try {
      const issueRes = await fetch(`${API_URL}/api/v1/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer_did: issuerDid,
          holder_did: formData.holderDid,
          schema_id: "degree-v1",
          credential_subject: {
            degree: formData.degreeName,
            date: formData.graduationDate,
            cgpa: parseFloat(formData.cgpa),
          },
          issuer_wallet_address: address,
        }),
      });
      if (!issueRes.ok) throw new Error((await issueRes.json()).detail || "Issue failed");
      const issued = await issueRes.json();

      const anchor = new Contract(ADDRESSES.credentialAnchor, ANCHOR_ABI, signer);
      const credHash = toBytes32(issued.credential_hash);
      const poseidon = toBytes32(issued.poseidon_commitment);
      const tx = await anchor.anchorCredential(credHash, poseidon, issuerDid, ethers.ZeroHash);
      const receipt = await tx.wait();

      await fetch(`${API_URL}/api/v1/credentials/${issued.credential_hash}/anchored`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_hash: issued.credential_hash, tx_hash: receipt.hash }),
      });

      toast.success("Credential issued and anchored", {
        description: `Confirmed in block ${receipt.blockNumber}.`,
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
        description="Connect MetaMask to register and issue credentials."
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
        description="Register your institution once, then issue and anchor verifiable credentials."
        actions={
          issuerProfile ? (
            <StatusBadge status="registered" label={`Registered · ${issuerProfile.name}`} />
          ) : (
            <StatusBadge status="unregistered" />
          )
        }
      />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <HashChip value={issuerDid} label="issuer did" className="max-w-full" />
      </div>

      {!issuerProfile && (
        <Card className="mt-6 flex flex-col gap-4 border-border bg-muted/40 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Register your institution to start issuing
              </p>
              <p className="text-sm text-muted-foreground">
                Sign one MetaMask transaction to register on-chain, then you can
                issue credentials.
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
              Register on-chain
            </Button>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issue">Issue credential</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Issued" value={credentials.length} />
            <StatCard label="Active" value={activeCount} />
            <StatCard label="Revoked" value={revokedCount} />
          </div>

          <div className="flex flex-col gap-3">
            {isLoadingData ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : credentials.length === 0 ? (
              <EmptyState
                title="No credentials issued yet"
                description="Switch to the Issue tab to create your first verifiable credential."
              />
            ) : (
              credentials.map((cred) => (
                <CredentialCard
                  key={cred.hash}
                  variant="row"
                  hash={cred.hash}
                  subtitle={`Holder: ${cred.holder_did}`}
                  status={cred.status === "Active" ? "active" : "revoked"}
                  actions={
                    cred.status === "Active" ? (
                      <RevokeAction hash={cred.hash} onRevoked={fetchCredentials} />
                    ) : undefined
                  }
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="issue" className="mt-6">
          <Card className="max-w-xl gap-5 p-6 sm:p-8">
            <div className="px-6 sm:px-8">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Issue &amp; anchor credential
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Creates a W3C verifiable credential, then anchors its Poseidon
                commitment via MetaMask.
              </p>
            </div>
            <form onSubmit={handleIssue} className="flex flex-col gap-4 px-6 sm:px-8">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="holder-did">Holder DID</Label>
                <Input
                  id="holder-did"
                  required
                  placeholder="did:ethr:0x..."
                  value={formData.holderDid}
                  onChange={(e) => setFormData({ ...formData, holderDid: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="degree-name">Degree name</Label>
                <Input
                  id="degree-name"
                  required
                  placeholder="B.Sc Computer Science"
                  value={formData.degreeName}
                  onChange={(e) => setFormData({ ...formData, degreeName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="graduation-date">Graduation date</Label>
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
                  <Label htmlFor="cgpa">CGPA</Label>
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
                <p className="text-xs text-warning">
                  Register your institution above before issuing credentials.
                </p>
              )}
              <Button type="submit" disabled={isIssuing || !issuerProfile} size="lg">
                {isIssuing && <Loader2 className="size-4 animate-spin" />}
                Sign anchor in MetaMask
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
