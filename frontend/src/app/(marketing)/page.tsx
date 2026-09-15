import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { ScanSearch } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { ProofTrace } from "@/components/marketing/proof-trace";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { RolePanel } from "@/components/marketing/role-panel";
import {
  HolderVignette,
  IssuerVignette,
  VerifierVignette,
} from "@/components/marketing/role-vignettes";
import { PrivacyBlock } from "@/components/marketing/privacy-block";
import { DemoRunner } from "@/components/marketing/demo-runner";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-dot-grid bg-dot-grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28 lg:px-8">
          <div className="flex flex-col gap-6">
            <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
              Zero-knowledge credential infrastructure
            </span>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Prove what&apos;s true.
              <br />
              Reveal{" "}
              <span className={`${instrumentSerif.className} text-primary italic`}>
                nothing
              </span>{" "}
              else.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Universities issue anchored credentials. Students prove CGPA
              thresholds with zero-knowledge proofs. Employers verify on-chain
              without ever seeing a transcript.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/demo" className={cn(buttonVariants({ size: "lg" }))}>
                Try the demo
              </Link>
              <Link
                href="/verifier"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <ScanSearch className="size-4" />
                Open verifier
              </Link>
            </div>
          </div>

          <ProofTrace />
        </div>
      </section>

      <TrustStrip />

      {/* How it works */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col gap-3 text-center">
          <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
            How it works
          </span>
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Three roles, one verifiable chain of trust
          </h2>
        </div>
        <HowItWorks />
      </section>

      {/* Role sections */}
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 py-20 sm:px-6 lg:px-8">
        <RolePanel
          eyebrow="For issuers"
          title="Issue and anchor credentials on-chain"
          description="Universities register once, then issue W3C verifiable credentials that are committed with Poseidon and anchored to the CredentialAnchor contract from their own wallet."
          bullets={[
            "Self-register via IssuerRegistry, no central gatekeeper",
            "Every credential gets a Poseidon commitment and on-chain anchor",
            "Revoke instantly — the Merkle root updates for every verifier",
          ]}
          href="/issuer"
          ctaLabel="Open issuer portal"
          visual={<IssuerVignette />}
        />
        <RolePanel
          eyebrow="For holders"
          title="Prove a threshold, not your transcript"
          description="Credentials are decrypted client-side into your wallet. When a verifier asks a question, you generate a Groth16 proof in-browser and submit only the proof — never the underlying data."
          bullets={[
            "Claim and non-revocation proofs generated entirely in-browser",
            "Share a DID QR code or a one-tap wallet deep link",
            "Nothing leaves your device except the proof itself",
          ]}
          href="/wallet"
          ctaLabel="Open holder wallet"
          visual={<HolderVignette />}
          reverse
        />
        <RolePanel
          eyebrow="For verifiers"
          title="Verify on-chain, disclose nothing"
          description="Request a CGPA threshold and get a binary, cryptographically-backed answer straight from the VerificationGateway contract — or fall back to AI forensics for legacy paper scans."
          bullets={[
            "Threshold requests shareable via QR or deep link",
            "Pass/fail results checked directly on-chain",
            "ELA + CNN forensics with a composite TrustVerse Score for scans",
          ]}
          href="/verifier"
          ctaLabel="Open verifier dashboard"
          visual={<VerifierVignette />}
        />
      </section>

      {/* Privacy guarantee */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col gap-3 text-center">
          <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
            The privacy guarantee
          </span>
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Zero-knowledge means zero disclosure
          </h2>
          <p className="text-sm text-muted-foreground">
            The Groth16 circuits prove a statement is true without exposing
            any of the values behind it.
          </p>
        </div>
        <PrivacyBlock />
      </section>

      {/* Demo entry + live seeder for developers */}
      <section id="demo" className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-base font-semibold text-foreground">
              Interactive demo — no wallet required
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Walk the full issue → prove → verify story with simulated data under{" "}
              <code className="text-xs">/demo</code>.
            </p>
          </div>
          <Link href="/demo" className={cn(buttonVariants({ size: "lg" }))}>
            Open demo mode
          </Link>
        </div>
        <DemoRunner />
      </section>
    </div>
  );
}
