"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { useServices } from "@/services";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WalletMenu } from "@/components/layout/wallet-menu";
import {
  getAppNavItems,
  getOverviewNavItem,
  type NavItem,
} from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/demo") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarNav({
  pathname,
  basePath,
  onNavigate,
}: {
  pathname: string;
  basePath: "" | "/demo";
  onNavigate?: () => void;
}) {
  const overview = getOverviewNavItem(basePath);
  const items = getAppNavItems(basePath);
  return (
    <nav className="flex flex-col gap-1">
      <NavLink item={overview} pathname={pathname} onNavigate={onNavigate} />
      <div className="my-2 h-px bg-border" />
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function currentSectionLabel(pathname: string, basePath: "" | "/demo") {
  const labels: Record<string, string> = {
    [basePath || "/"]: basePath === "/demo" ? "Demo home" : "Overview",
    [`${basePath}/issuer`]: "Issuer Portal",
    [`${basePath}/wallet`]: "Holder Wallet",
    [`${basePath}/verifier`]: "Verifier",
    [`${basePath}/verify`]: "Public Verify",
  };
  const match = Object.keys(labels)
    .filter((href) => href !== "/" && href !== "/demo" && pathname.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];
  return labels[match ?? pathname] ?? (basePath === "/demo" ? "Demo" : "TrustVerse");
}

interface AppShellProps {
  children: React.ReactNode;
  banner?: React.ReactNode;
}

/** Portal shell: fixed sidebar nav + topbar, mobile sheet nav. */
export function AppShell({ children, banner }: AppShellProps) {
  const pathname = usePathname();
  const { basePath } = useServices();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {banner}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Link href={basePath || "/"} className="focus-visible:outline-none">
              <Logo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav pathname={pathname} basePath={basePath} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <SheetContent
                side="left"
                className="w-72"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <SheetHeader>
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <div className="px-2">
                  <SidebarNav
                    pathname={pathname}
                    basePath={basePath}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 md:hidden">
              <Logo showWordmark={false} />
            </div>

            <p className="hidden text-sm font-medium text-foreground md:block">
              {currentSectionLabel(pathname, basePath)}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <WalletMenu />
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
