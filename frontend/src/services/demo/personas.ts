export type PersonaRole = "issuer" | "holder" | "verifier";

export interface DemoPersona {
  id: string;
  label: string;
  role: PersonaRole;
  roleHint: string;
  address: string;
  did: string;
  avatarColor: string;
}

/** Seed identities matching backend/app/api/endpoints/demo.py Hardhat accounts. */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "university",
    label: "TrustVerse University",
    role: "issuer",
    roleHint: "Issuer — register & issue credentials",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    did: "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    avatarColor: "bg-primary/15 text-primary",
  },
  {
    id: "alice",
    label: "Alice",
    role: "holder",
    roleHint: "Holder — CGPA 8.9, active credential",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    did: "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    avatarColor: "bg-success/15 text-success",
  },
  {
    id: "bob",
    label: "Bob",
    role: "holder",
    roleHint: "Holder — CGPA 6.4, revoked credential",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    did: "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    avatarColor: "bg-warning/15 text-warning",
  },
  {
    id: "acme",
    label: "Acme Corp",
    role: "verifier",
    roleHint: "Verifier — request ZK proofs & forensics",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    did: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    avatarColor: "bg-accent text-accent-foreground",
  },
];

export const UNIVERSITY_DID = DEMO_PERSONAS[0].did;
export const ALICE_DID = DEMO_PERSONAS[1].did;
export const BOB_DID = DEMO_PERSONAS[2].did;
export const ACME_DID = DEMO_PERSONAS[3].did;

export function getPersonaById(id: string | null | undefined): DemoPersona | null {
  if (!id) return null;
  return DEMO_PERSONAS.find((p) => p.id === id) ?? null;
}

export function getPersonaByAddress(address: string | null | undefined): DemoPersona | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  return DEMO_PERSONAS.find((p) => p.address.toLowerCase() === lower) ?? null;
}

export function getPersonaByDid(did: string | null | undefined): DemoPersona | null {
  if (!did) return null;
  const lower = did.toLowerCase();
  return DEMO_PERSONAS.find((p) => p.did.toLowerCase() === lower) ?? null;
}
