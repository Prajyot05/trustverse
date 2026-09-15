"use client";

import * as React from "react";
import { useServices } from "@/services";
import type { DirectoryIssuer } from "@/services/types";
import { PageHeader } from "@/components/layout/page-header";
import { VerifiedBadge } from "@/components/data/verified-badge";
import { Card } from "@/components/ui/card";
import { HashChip } from "@/components/data/hash-chip";
import { EmptyState } from "@/components/feedback/empty-state";

export default function DirectoryPage() {
  const { product } = useServices();
  const [rows, setRows] = React.useState<DirectoryIssuer[]>([]);

  React.useEffect(() => {
    product.listDirectory().then(setRows).catch(() => setRows([]));
  }, [product]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Trust"
        title="Issuer directory"
        description="Universities that have bound a domain (did:web) and an accreditation flag. Verifiers should treat unverified issuers with caution."
      />
      <div className="mt-8 flex flex-col gap-3">
        {rows.length === 0 ? (
          <EmptyState title="No issuers yet" description="Registered universities appear here." />
        ) : (
          rows.map((i) => (
            <Card key={i.did} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <VerifiedBadge verified={i.verified} name={i.name} className="font-heading text-base font-semibold" />
                {i.domain && <p className="mt-1 text-sm text-muted-foreground">{i.domain} · did:web:{i.domain}</p>}
                {i.accreditation && (
                  <p className="text-xs text-muted-foreground">Accreditation: {i.accreditation}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <HashChip value={i.did} label="DID" />
                <p className="text-xs text-muted-foreground">{i.issued ?? 0} credentials issued</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
