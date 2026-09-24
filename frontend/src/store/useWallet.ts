import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BrowserProvider, Wallet, type Signer } from "ethers";
import { toast } from "sonner";
import {
  EXPECTED_CHAIN_ID,
  switchToExpectedChain,
} from "@/lib/network";
import { friendlyError } from "@/lib/errors";

export type SessionKind = "metamask" | "embedded" | null;

const EMBEDDED_KEY = "trustverse-embedded-key-v1";

interface WalletState {
  address: string | null;
  signer: Signer | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  chainId: number | null;
  sessionKind: SessionKind;
  hydrated: boolean;
  connect: () => Promise<void>;
  connectEmbedded: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function getEthereum() {
  return typeof window !== "undefined" ? window.ethereum : undefined;
}

function loadOrCreateEmbedded(): Signer {
  if (typeof window === "undefined") return Wallet.createRandom();
  const existing = window.localStorage.getItem(EMBEDDED_KEY);
  if (existing) {
    try {
      return new Wallet(existing);
    } catch {
      /* fall through */
    }
  }
  const w = Wallet.createRandom();
  window.localStorage.setItem(EMBEDDED_KEY, (w as unknown as { privateKey: string }).privateKey);
  return w;
}

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      signer: null,
      provider: null,
      isConnecting: false,
      chainId: null,
      sessionKind: null,
      hydrated: false,

      hydrate: async () => {
        const { sessionKind } = get();
        if (sessionKind === "embedded") {
          await get().connectEmbedded();
          set({ hydrated: true });
          return;
        }
        const ethereum = getEthereum();
        if (!ethereum) {
          set({ hydrated: true });
          return;
        }
        try {
          const provider = new BrowserProvider(ethereum);
          const accounts = (await provider.send("eth_accounts", [])) as string[];
          const net = await provider.getNetwork();
          if (accounts[0]) {
            const signer = await provider.getSigner();
            set({
              address: accounts[0],
              signer,
              provider,
              chainId: Number(net.chainId),
              sessionKind: "metamask",
              hydrated: true,
            });
          } else {
            set({ hydrated: true, chainId: Number(net.chainId) });
          }
          if (!ethereum._tvListenersAttached) {
            ethereum.on?.("accountsChanged", (...args: unknown[]) => {
              const accs = Array.isArray(args[0]) ? (args[0] as string[]) : [];
              if (!accs.length) {
                get().disconnect();
                return;
              }
              void get().hydrate();
            });
            ethereum.on?.("chainChanged", () => {
              void get().hydrate();
            });
            ethereum._tvListenersAttached = true;
          }
        } catch {
          set({ hydrated: true });
        }
      },

      connect: async () => {
        set({ isConnecting: true });
        try {
          const ethereum = getEthereum();
          if (!ethereum) {
            toast.error("MetaMask not found", {
              description: "Install MetaMask, or continue with a passkey-style embedded wallet.",
            });
            set({ isConnecting: false });
            return;
          }
          const provider = new BrowserProvider(ethereum);
          await provider.send("eth_requestAccounts", []);
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          if (chainId !== EXPECTED_CHAIN_ID) {
            try {
              await switchToExpectedChain();
            } catch (e) {
              const err = friendlyError(e, {
                title: "Wrong network",
                description: "Switch MetaMask to Hardhat Local (31337) and try again.",
              });
              toast.error(err.title, { description: err.description });
            }
          }
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const net = await provider.getNetwork();
          set({
            address,
            signer,
            provider,
            isConnecting: false,
            chainId: Number(net.chainId),
            sessionKind: "metamask",
          });
        } catch (err) {
          const mapped = friendlyError(err, {
            title: "Could not connect",
            description: "You cancelled the request, or MetaMask is locked.",
          });
          toast.error(mapped.title, { description: mapped.description });
          set({ isConnecting: false });
        }
      },

      connectEmbedded: async () => {
        set({ isConnecting: true });
        try {
          const wallet = loadOrCreateEmbedded();
          const address = await wallet.getAddress();
          set({
            address,
            signer: wallet,
            provider: null,
            isConnecting: false,
            chainId: EXPECTED_CHAIN_ID,
            sessionKind: "embedded",
          });
        } catch (err) {
          console.error(err);
          set({ isConnecting: false });
        }
      },

      disconnect: () =>
        set({
          address: null,
          signer: null,
          provider: null,
          sessionKind: null,
          chainId: get().chainId,
        }),

      switchNetwork: async () => {
        try {
          await switchToExpectedChain();
          await get().hydrate();
          toast.success("Switched network");
        } catch (e) {
          const err = friendlyError(e, {
            title: "Could not switch network",
            description: "Add Hardhat Local (chain 31337) in MetaMask.",
          });
          toast.error(err.title, { description: err.description });
        }
      },
    }),
    {
      name: "trustverse-wallet-v1",
      partialize: (s) => ({
        sessionKind: s.sessionKind,
        address: s.address,
      }),
    }
  )
);
