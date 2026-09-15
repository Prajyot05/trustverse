"use client";

import Link from "next/link";
import { GraduationCap, Building2, Briefcase, ArrowRight } from "lucide-react";
import { useRole, ROLE_HOME, ROLE_DEMO_HOME, type AppRole } from "@/store/useRole";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

const ROLES: Array<{
  id: AppRole;
  title: string;
  body: string;
  icon: typeof GraduationCap;
}> = [
  {
    id: "holder",
    title: "I'm a student",
    body: "Claim your degree, answer employer requests in one tap, and keep your transcript private.",
    icon: GraduationCap,
  },
  {
    id: "issuer",
    title: "I'm a university",
    body: "Issue a graduating class, revoke when needed, and let employers verify without calling the registrar.",
    icon: Building2,
  },
  {
    id: "verifier",
    title: "I'm an employer",
    body: "Ask a yes/no question about a candidate. Get a signed report — never a full transcript.",
    icon: Briefcase,
  },
];

export default function GetStartedPage() {
  const setRole = useRole((s) => s.setRole);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">Get started</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold">Who are you?</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        TrustVerse is built around three jobs. Pick yours — we&apos;ll take you to the right portal.
        No wallet required to try the sandbox.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.id} className="flex flex-col gap-4 p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-semibold">{role.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{role.body}</p>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <Button asChild>
                  <Link href={ROLE_HOME[role.id]} onClick={() => setRole(role.id)}>
                    Open {role.id === "holder" ? "wallet" : role.id === "issuer" ? "issuer portal" : "verifier"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Link
                  href={ROLE_DEMO_HOME[role.id]}
                  onClick={() => setRole(role.id)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center")}
                >
                  Try in sandbox
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
