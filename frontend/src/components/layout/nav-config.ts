import type { LucideIcon } from "lucide-react";
import { Fingerprint, LayoutDashboard, ScanSearch, Search, Shield } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV_ITEMS: NavItem[] = [
  { href: "/issuer", label: "Issuer Portal", icon: Fingerprint },
  { href: "/wallet", label: "Holder Wallet", icon: Shield },
  { href: "/verifier", label: "Verifier", icon: ScanSearch },
  { href: "/verify", label: "Public Verify", icon: Search },
];

export const OVERVIEW_NAV_ITEM: NavItem = {
  href: "/",
  label: "Overview",
  icon: LayoutDashboard,
};
