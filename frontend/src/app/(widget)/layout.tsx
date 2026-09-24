"use client";

import { ServicesProvider } from "@/services";

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return <ServicesProvider mode="live">{children}</ServicesProvider>;
}
