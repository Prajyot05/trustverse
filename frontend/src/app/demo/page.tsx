"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Fingerprint, ScanSearch, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import {
  DEMO_PERSONAS,
  ALICE_CRED_HASH,
  BOB_CRED_HASH,
  ALICE_DID,
  useDemoStore,
  ensureDemoSeeded,
} from "@/services";
import { truncateMiddle } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HashChip } from "@/components/data/hash-chip";

const STEPS = [
  {
    n: "01",
    title: "Issue as University",
    body: "Open the Issuer portal as TrustVerse University. Browse Alice and Bob’s seeded credentials, or issue a new one.",
    href: "/demo/issuer",
    cta: "Open Issuer",
    icon: Fingerprint,
  },
  {
    n: "02",
    title: "Request as Acme Corp",
    body: "Switch to the Verifier portal, pick Acme Corp, and create a CGPA ≥ 8.0 proof request (or use the seeded pending one).",
    href: "/demo/verifier",
    cta: "Open Verifier",
    icon: ScanSearch,
  },
  {
    n: "03",
    title: "Prove as Alice",
    body: "Open the Holder wallet as Alice, open the pending request, and walk the simulated claim + non-revocation proof stepper.",
    href: "/demo/wallet",
    cta: "Open Wallet",
    icon: Shield,
  },
];

export default function DemoHomePage() {
  const setPersona = useDemoStore((s) => s.setPersona);

  React.useEffect(() => {
    ensureDemoSeeded();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-primary uppercase">
          <FlaskConical className="size-3.5" />
          Interactive demo
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Try TrustVerse without a wallet
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Same portals as the live app — issuer, holder, verifier, and public
          verify — backed by simulated data. No MetaMask, no backend, no
          blockchain.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
          Guided walkthrough
        </h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.n}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                    {step.n}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className="size-3.5 text-primary" />
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Tip: switch to{" "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setPersona("bob");
              toast.success("Switched to Bob");
            }}
          >
            Bob
          </button>{" "}
          in the wallet to see a revoked credential fail a proof.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
          Personas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEMO_PERSONAS.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${p.avatarColor}`}
              >
                {p.label.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.roleHint}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                  {truncateMiddle(p.address, 6, 4)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPersona(p.id);
                  toast.success(`Acting as ${p.label}`);
                }}
              >
                Select
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
          Sample credential hashes
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Paste these into{" "}
          <Link href="/demo/verify" className="text-foreground underline-offset-2 hover:underline">
            Public Verify
          </Link>{" "}
          to see a valid (Alice) or revoked (Bob) result.
        </p>
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Alice — active</p>
              <p className="text-xs text-muted-foreground">{ALICE_DID}</p>
            </div>
            <HashChip value={ALICE_CRED_HASH} copyable className="max-w-full" />
          </Card>
          <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Bob — revoked</p>
              <p className="text-xs text-muted-foreground">Fails public verify</p>
            </div>
            <HashChip value={BOB_CRED_HASH} copyable className="max-w-full" />
          </Card>
        </div>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/demo/verify">
              <Search className="size-4" />
              Open Public Verify
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
