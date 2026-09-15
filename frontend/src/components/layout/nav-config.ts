import type { LucideIcon } from "lucide-react";
import { Fingerprint, FlaskConical, LayoutDashboard, ScanSearch, Search, Shield } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PORTAL_ITEMS: Omit<NavItem, "href">[] = [
  { label: "Issuer Portal", icon: Fingerprint },
  { label: "Holder Wallet", icon: Shield },
  { label: "Verifier", icon: ScanSearch },
  { label: "Public Verify", icon: Search },
];

const PORTAL_PATHS = ["/issuer", "/wallet", "/verifier", "/verify"] as const;

/** Live (empty basePath) or demo (`/demo`) portal nav items. */
export function getAppNavItems(basePath: "" | "/demo" = ""): NavItem[] {
  return PORTAL_PATHS.map((path, i) => ({
    ...PORTAL_ITEMS[i],
    href: `${basePath}${path}`,
  }));
}

export function getOverviewNavItem(basePath: "" | "/demo" = ""): NavItem {
  return {
    href: basePath || "/",
    label: basePath === "/demo" ? "Demo home" : "Overview",
    icon: basePath === "/demo" ? FlaskConical : LayoutDashboard,
  };
}

/** @deprecated Prefer getAppNavItems("") — kept for marketing header. */
export const APP_NAV_ITEMS: NavItem[] = getAppNavItems("");

export const OVERVIEW_NAV_ITEM: NavItem = getOverviewNavItem("");

export const DEMO_NAV_LINK: NavItem = {
  href: "/demo",
  label: "Demo",
  icon: FlaskConical,
};
