import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppRole = "holder" | "issuer" | "verifier";

interface RoleState {
  role: AppRole | null;
  setRole: (role: AppRole | null) => void;
}

export const useRole = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
    }),
    { name: "trustverse-role-v1" }
  )
);

export const ROLE_HOME: Record<AppRole, string> = {
  holder: "/wallet",
  issuer: "/issuer",
  verifier: "/verifier",
};

export const ROLE_DEMO_HOME: Record<AppRole, string> = {
  holder: "/demo/wallet",
  issuer: "/demo/issuer",
  verifier: "/demo/verifier",
};
