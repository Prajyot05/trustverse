const FACTS = [
  "Groth16 zk-SNARKs",
  "Poseidon commitments",
  "W3C Verifiable Credentials",
  "On-chain anchoring",
  "ELA + CNN forensics",
];

/** Mono fact strip communicating the cryptographic primitives in use. */
export function TrustStrip() {
  return (
    <div className="border-y border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-5 sm:px-6 lg:px-8">
        {FACTS.map((fact, i) => (
          <span key={fact} className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{fact}</span>
            {i < FACTS.length - 1 && (
              <span className="size-1 rounded-full bg-border" aria-hidden="true" />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
