import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HolderCredential, IssuerProfile, VerifyRequest } from "../types";
import {
  ACME_DID,
  ALICE_DID,
  BOB_DID,
  UNIVERSITY_DID,
  DEMO_PERSONAS,
} from "./personas";

export interface DemoIssuer extends IssuerProfile {
  did: string;
  wallet_address: string;
}

export interface DemoCredential extends HolderCredential {
  hash: string;
  issuer_did: string;
  holder_did: string;
  status: string;
  poseidon_commitment: string;
  claims_hash: string;
  salt: string;
  nullifier: string;
  anchored_at: number;
  on_chain: { status: string };
  on_chain_revoked: boolean;
  credential: {
    credentialSubject: { degree: string; cgpa: number; date: string };
    trustverseCommitment: {
      credentialRoot: string;
      subjectId: string;
      cgpaScaled: string;
      degreeCode: string;
      issueDate: string;
      issuerPubKey: string;
      salt: string;
      schemaId: string;
    };
  };
}

export interface DemoRequest extends VerifyRequest {
  id: number;
  verifier_did: string;
  holder_did?: string;
  issuer_did?: string;
  attribute: string;
  threshold: number;
  threshold_display: number;
  status: string;
  wallet_deep_link: string;
  claim_tx_hash?: string;
  nonrev_tx_hash?: string;
  block_number?: number;
  result?: string;
  credential_hash?: string;
}

interface DemoState {
  personaId: string | null;
  issuers: DemoIssuer[];
  credentials: DemoCredential[];
  requests: DemoRequest[];
  nextRequestId: number;
  blockNumber: number;
  seeded: boolean;
  setPersona: (id: string | null) => void;
  seed: () => void;
  reset: () => void;
  nextBlock: () => number;
  nextFakeHash: (prefix?: string) => string;
  upsertIssuer: (issuer: DemoIssuer) => void;
  addCredential: (cred: DemoCredential) => void;
  updateCredential: (hash: string, patch: Partial<DemoCredential>) => void;
  addRequest: (req: Omit<DemoRequest, "id" | "wallet_deep_link">) => DemoRequest;
  updateRequest: (id: number | string, patch: Partial<DemoRequest>) => void;
}

function hex32(seed: string): string {
  // Deterministic-ish 32-byte hex from a short seed string (demo only).
  let h = 0x811c9dc5;
  const out: string[] = [];
  for (let i = 0; i < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 0x01000193);
    out.push(((h >>> 0) % 16).toString(16));
  }
  return "0x" + out.join("");
}

function randomHex32(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function buildCommitment(
  subjectId: string,
  cgpa: number,
  degree: string,
  date: string,
  salt: string,
  root: string
) {
  const cgpaScaled = String(Math.round(cgpa * 100));
  return {
    credentialRoot: root,
    subjectId,
    cgpaScaled,
    degreeCode: String(degree.length * 1000 + 42),
    issueDate: date.replace(/-/g, ""),
    issuerPubKey: hex32("issuer-pubkey-" + UNIVERSITY_DID),
    salt,
    schemaId: "1",
  };
}

function makeCredential(opts: {
  hash: string;
  holderDid: string;
  degree: string;
  cgpa: number;
  date: string;
  status: "Active" | "Revoked";
}): DemoCredential {
  const salt = hex32("salt-" + opts.hash);
  const claimsHash = hex32("claims-" + opts.hash);
  const poseidon = hex32("poseidon-" + opts.hash);
  const root = hex32("root-" + opts.hash);
  const nullifier = String(parseInt(opts.hash.slice(2, 10), 16) % 1_000_000);
  return {
    hash: opts.hash,
    issuer_did: UNIVERSITY_DID,
    holder_did: opts.holderDid,
    status: opts.status,
    poseidon_commitment: poseidon,
    claims_hash: claimsHash,
    salt,
    nullifier,
    anchored_at: 1_746_000_000, // fixed demo timestamp
    on_chain: { status: "ANCHORED" },
    on_chain_revoked: opts.status === "Revoked",
    credential: {
      credentialSubject: {
        degree: opts.degree,
        cgpa: opts.cgpa,
        date: opts.date,
      },
      trustverseCommitment: buildCommitment(
        opts.holderDid,
        opts.cgpa,
        opts.degree,
        opts.date,
        salt,
        root
      ),
    },
  };
}

export const ALICE_CRED_HASH = hex32("alice-cred-v1");
export const BOB_CRED_HASH = hex32("bob-cred-v1");

function buildSeedState(): Pick<
  DemoState,
  "issuers" | "credentials" | "requests" | "nextRequestId" | "blockNumber" | "seeded" | "personaId"
> {
  const university: DemoIssuer = {
    did: UNIVERSITY_DID,
    name: "TrustVerse University",
    wallet_address: DEMO_PERSONAS[0].address,
    is_active: true,
    verified: true,
    domain: "trustverse.university",
    accreditation: "NAAC A++",
  };

  const alice = makeCredential({
    hash: ALICE_CRED_HASH,
    holderDid: ALICE_DID,
    degree: "Bachelor of Computer Engineering",
    cgpa: 8.9,
    date: "2026-05-15",
    status: "Active",
  });

  const bob = makeCredential({
    hash: BOB_CRED_HASH,
    holderDid: BOB_DID,
    degree: "Bachelor of Computer Engineering",
    cgpa: 6.4,
    date: "2026-05-15",
    status: "Revoked",
  });

  const pending: DemoRequest = {
    id: 1,
    verifier_did: ACME_DID,
    holder_did: ALICE_DID,
    issuer_did: UNIVERSITY_DID,
    attribute: "cgpa",
    threshold: 800,
    threshold_display: 8.0,
    status: "pending",
    wallet_deep_link: "/demo/wallet?request=1",
  };

  return {
    personaId: null,
    issuers: [university],
    credentials: [alice, bob],
    requests: [pending],
    nextRequestId: 2,
    blockNumber: 42,
    seeded: true,
  };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...buildSeedState(),

      setPersona: (id) => set({ personaId: id }),

      seed: () => set(buildSeedState()),

      reset: () => set(buildSeedState()),

      nextBlock: () => {
        const n = get().blockNumber + 1;
        set({ blockNumber: n });
        return n;
      },

      nextFakeHash: () => randomHex32(),

      upsertIssuer: (issuer) =>
        set((s) => {
          const others = s.issuers.filter((i) => i.did !== issuer.did);
          return { issuers: [...others, issuer] };
        }),

      addCredential: (cred) =>
        set((s) => ({ credentials: [...s.credentials, cred] })),

      updateCredential: (hash, patch) =>
        set((s) => ({
          credentials: s.credentials.map((c) =>
            c.hash === hash ? { ...c, ...patch } : c
          ),
        })),

      addRequest: (req) => {
        const id = get().nextRequestId;
        const full: DemoRequest = {
          ...req,
          id,
          wallet_deep_link: `/demo/wallet?request=${id}`,
        };
        set((s) => ({
          requests: [full, ...s.requests],
          nextRequestId: id + 1,
        }));
        return full;
      },

      updateRequest: (id, patch) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            String(r.id) === String(id) ? { ...r, ...patch } : r
          ),
        })),
    }),
    {
      name: "trustverse-demo-v1",
      partialize: (s) => ({
        personaId: s.personaId,
        issuers: s.issuers,
        credentials: s.credentials,
        requests: s.requests,
        nextRequestId: s.nextRequestId,
        blockNumber: s.blockNumber,
        seeded: s.seeded,
      }),
    }
  )
);

/** Ensure seed data exists on first load (e.g. after clearing storage). */
export function ensureDemoSeeded() {
  const s = useDemoStore.getState();
  const hasUniversity = s.issuers.some((i) => i.did === UNIVERSITY_DID);
  if (!s.seeded || s.credentials.length === 0 || !hasUniversity) {
    s.seed();
  }
}
