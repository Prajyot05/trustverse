"use client";

import * as React from "react";
import { useWallet } from "@/store/useWallet";

/** Restores MetaMask / embedded session after refresh. */
export function WalletHydrator() {
  const hydrate = useWallet((s) => s.hydrate);
  React.useEffect(() => {
    const run = () => {
      void hydrate();
    };
    const persist = useWallet.persist;
    if (persist.hasHydrated()) run();
    return persist.onFinishHydration(run);
  }, [hydrate]);
  return null;
}

