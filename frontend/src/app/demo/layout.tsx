"use client";

import { ServicesProvider } from "@/services";
import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/demo/demo-banner";

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ServicesProvider mode="demo">
      <AppShell banner={<DemoBanner />}>{children}</AppShell>
    </ServicesProvider>
  );
}
