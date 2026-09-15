"use client";

import * as React from "react";
import { didFromAddress } from "@/lib/contracts";
import { useWallet } from "@/store/useWallet";
import { createLiveServices } from "./live";
import { createDemoServices } from "./demo/services";
import { ensureDemoSeeded, useDemoStore } from "./demo/store";
import { getPersonaById } from "./demo/personas";
import type { IdentityState, ServicesMode, TrustVerseServices } from "./types";

const ServicesContext = React.createContext<TrustVerseServices | null>(null);

const liveServicesSingleton = createLiveServices();
let demoServicesSingleton: TrustVerseServices | null = null;

function getDemoServices(): TrustVerseServices {
  if (!demoServicesSingleton) {
    demoServicesSingleton = createDemoServices();
  }
  return demoServicesSingleton;
}

interface ServicesProviderProps {
  mode: ServicesMode;
  children: React.ReactNode;
}

export function ServicesProvider({ mode, children }: ServicesProviderProps) {
  const value = React.useMemo(() => {
    if (mode === "demo") {
      ensureDemoSeeded();
      return getDemoServices();
    }
    return liveServicesSingleton;
  }, [mode]);

  return (
    <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
  );
}

export function useServices(): TrustVerseServices {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return ctx;
}

export function useIdentity(): IdentityState {
  const { mode } = useServices();
  const wallet = useWallet();
  const personaId = useDemoStore((s) => s.personaId);
  const setPersona = useDemoStore((s) => s.setPersona);

  if (mode === "demo") {
    const persona = getPersonaById(personaId);
    return {
      address: persona?.address ?? null,
      did: persona?.did ?? null,
      label: persona?.label ?? null,
      signer: null,
      isConnecting: false,
      connect: async () => {
        // PersonaPicker handles selection; no-op fallback.
      },
      disconnect: () => setPersona(null),
      selectPersona: (id: string) => setPersona(id),
    };
  }

  return {
    address: wallet.address,
    did: wallet.address ? didFromAddress(wallet.address) : null,
    label: null,
    signer: wallet.signer,
    isConnecting: wallet.isConnecting,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
  };
}
