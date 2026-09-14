"use client";

import * as React from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataField } from "@/components/data/data-field";
import { StatusBadge } from "@/components/data/status-badge";

interface SeedResult {
  university_did: string;
  alice_did: string;
  bob_did: string;
  pending_request_id: number | string;
}

/** Seeds a demo dataset against the backend for the thesis walkthrough. */
export function DemoRunner() {
  const [seeding, setSeeding] = React.useState(false);
  const [result, setResult] = React.useState<SeedResult | null>(null);

  const runDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/demo/seed`, { method: "POST" });
      if (!res.ok) throw new Error("Seed request failed");
      const data = await res.json();
      setResult(data);
      toast.success("Demo data seeded");
    } catch {
      toast.error("Could not reach the backend", {
        description: "Start it with ./scripts/dev.sh, then try again.",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card className="gap-5 p-6 sm:p-8">
      <div className="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-semibold text-foreground">
            Run the guided demo
          </p>
          <p className="text-sm text-muted-foreground">
            Seeds a university, two holders and a pending verification request.
          </p>
        </div>
        <Button onClick={runDemo} disabled={seeding} size="lg">
          {seeding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlayCircle className="size-4" />
          )}
          {seeding ? "Seeding…" : "Seed demo data"}
        </Button>
      </div>

      {result && (
        <div className="grid grid-cols-1 gap-4 border-t border-border px-6 pt-5 sm:grid-cols-2 sm:px-8">
          <DataField label="University DID" value={result.university_did} mono />
          <DataField
            label="Pending request"
            value={`#${result.pending_request_id}`}
            mono
          />
          <DataField
            label="Alice (holder)"
            value={
              <span className="flex items-center gap-2">
                <span className="truncate font-mono text-[13px]">
                  {result.alice_did}
                </span>
                <StatusBadge status="active" />
              </span>
            }
          />
          <DataField
            label="Bob (holder)"
            value={
              <span className="flex items-center gap-2">
                <span className="truncate font-mono text-[13px]">
                  {result.bob_did}
                </span>
                <StatusBadge status="revoked" />
              </span>
            }
          />
        </div>
      )}
    </Card>
  );
}
