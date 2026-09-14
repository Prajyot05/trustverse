const STEPS = [
  {
    title: "Issue & anchor",
    description:
      "A university issues a W3C verifiable credential, commits it with Poseidon, and anchors the root on-chain via MetaMask.",
  },
  {
    title: "Request & prove",
    description:
      "A verifier requests a CGPA threshold. The holder generates Groth16 claim and non-revocation proofs entirely in-browser.",
  },
  {
    title: "Verify on-chain",
    description:
      "The VerificationGateway checks both proofs on-chain. The verifier learns pass or fail only — never the transcript.",
  },
];

/** Three-step horizontal process explainer with hairline connectors. */
export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
      {STEPS.map((step, i) => (
        <div key={step.title} className="relative flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm text-primary">
              {i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden="true" />
            )}
          </div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
