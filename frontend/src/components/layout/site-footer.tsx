import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP_NAV_ITEMS } from "@/components/layout/nav-config";

/** Marketing site footer with portal links and a brand mark. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Zero-knowledge credential infrastructure for institutions, holders
            and verifiers.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Portals
          </span>
          <ul className="flex flex-col gap-2 text-sm">
            {APP_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Built on
          </span>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>Groth16 zero-knowledge proofs</li>
            <li>Poseidon commitments</li>
            <li>W3C Verifiable Credentials</li>
            <li>On-chain anchoring</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-border px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 TrustVerse. Thesis research project.</p>
        <p>No attribute values are ever disclosed to a verifier — only proof validity.</p>
      </div>
    </footer>
  );
}
