"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useIdentity, useServices } from "@/services";
import type { InboxItem } from "@/services/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InboxBell() {
  const { did } = useIdentity();
  const { product } = useServices();
  const [items, setItems] = React.useState<InboxItem[]>([]);

  React.useEffect(() => {
    if (!did) {
      setItems([]);
      return;
    }
    let cancelled = false;
    product.listNotifications(did).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    const t = setInterval(() => {
      product.listNotifications(did).then((rows) => {
        if (!cancelled) setItems(rows);
      });
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [did, product]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Inbox</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <DropdownMenuItem key={item.id} asChild className="flex-col items-start gap-0.5">
              <Link
                href={item.href || "#"}
                onClick={() => {
                  void product.markNotificationRead(item.id);
                }}
              >
                <span className="text-sm font-medium">{item.title}</span>
                {item.body && (
                  <span className="text-xs text-muted-foreground line-clamp-2">{item.body}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
