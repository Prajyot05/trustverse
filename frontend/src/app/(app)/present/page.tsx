"use client";

import * as React from "react";
import { useIdentity, useServices } from "@/services";
import { PageHeader } from "@/components/layout/page-header";
import { WalletGate } from "@/components/wallet/wallet-gate";
import { QRPanel } from "@/components/data/qr-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";

export default function PresentPage() {
  const { address, did } = useIdentity();
  const { product, api, basePath } = useServices();
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    if (!did) return;
    let cancelled = false;
    (async () => {
      const creds = await api.listHolderCredentials(did);
      const hash = creds[0]?.hash;
      const share = await product.createShare({
        holder_did: did,
        credential_hash: hash,
        predicate: "graduated",
        label: "Offline presentation",
        expires_in_hours: 24,
      });
      if (cancelled) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setUrl(`${origin}${basePath}${share.url?.startsWith("/") ? share.url : `/${share.url}`}`);
    })().catch(() => {
      toast.error("Could not create a presentation QR");
    });
    return () => {
      cancelled = true;
    };
  }, [did, api, product, basePath]);

  if (!address) {
    return (
      <WalletGate
        icon={<Fingerprint />}
        title="Present a credential"
        description="Connect to generate an offline QR a verifier can scan."
        suggestedRoles={["holder"]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader
        eyebrow="Holder"
        title="Present offline"
        description="Show this QR. A verifier can scan it to confirm you hold a valid, non-revoked credential — without seeing your transcript."
      />
      <Card className="mt-8 items-center gap-4 p-8 text-center">
        {url ? <QRPanel value={url} size={200} /> : <p className="text-sm text-muted-foreground">Creating link…</p>}
        <p className="break-all text-xs text-muted-foreground">{url}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }}
          disabled={!url}
        >
          Copy presentation link
        </Button>
      </Card>
    </div>
  );
}
