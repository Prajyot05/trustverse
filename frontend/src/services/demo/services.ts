import type { Groth16Proof } from "@/lib/contracts";
import type {
  ApiServices,
  AnalysisResult,
  ChainServices,
  ClaimProofInput,
  HolderCredential,
  IssueCredentialParams,
  IssuedCredential,
  NonRevProofInput,
  ProofBundle,
  ProofServices,
  PublicVerifyResult,
  TrustScoreResult,
  TrustVerseServices,
  TxReceipt,
  VerifyRequest,
} from "../types";
import { UNIVERSITY_DID } from "./personas";
import {
  ensureDemoSeeded,
  useDemoStore,
  type DemoCredential,
  type DemoIssuer,
} from "./store";

function delay(ms?: number): Promise<void> {
  const t = ms ?? 600 + Math.floor(Math.random() * 1400);
  return new Promise((resolve) => setTimeout(resolve, t));
}

function fakeProof(): ProofBundle {
  const z = "0";
  const proof: Groth16Proof = {
    pi_a: [z, z, z],
    pi_b: [
      [z, z],
      [z, z],
      [z, z],
    ],
    pi_c: [z, z, z],
  };
  return { proof, publicSignals: [z, z, z] };
}

function hexFromBytes(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function makeElaHeatmap(file: File): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const max = 480;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
    canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    ctx.filter = "invert(1) saturate(2.5) contrast(1.4)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
    // Overlay warm tint to look like ELA
    ctx.fillStyle = "rgba(255, 80, 40, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

function buildCommitment(
  holderDid: string,
  cgpa: number,
  degree: string,
  date: string,
  salt: string,
  root: string
) {
  return {
    credentialRoot: root,
    subjectId: holderDid,
    cgpaScaled: String(Math.round(cgpa * 100)),
    degreeCode: String(degree.length * 1000 + 42),
    issueDate: date.replace(/-/g, ""),
    issuerPubKey: useDemoStore.getState().nextFakeHash(),
    salt,
    schemaId: "1",
  };
}

function createDemoApi(): ApiServices {
  return {
    async getIssuer(did) {
      ensureDemoSeeded();
      await delay(400);
      const issuer = useDemoStore.getState().issuers.find((i) => i.did === did);
      return issuer ?? null;
    },

    async registerIssuer(params) {
      ensureDemoSeeded();
      await delay(800);
      const issuer: DemoIssuer = {
        did: params.did,
        name: params.name,
        wallet_address: params.wallet_address,
        is_active: true,
      };
      useDemoStore.getState().upsertIssuer(issuer);
      return issuer;
    },

    async listIssuerCredentials(issuerDid) {
      ensureDemoSeeded();
      await delay(500);
      return useDemoStore
        .getState()
        .credentials.filter((c) => c.issuer_did === issuerDid)
        .map(
          (c): IssuedCredential => ({
            hash: c.hash,
            holder_did: c.holder_did,
            status: c.status,
            on_chain: c.on_chain,
            credential: c.credential,
          })
        );
    },

    async issueCredential(params: IssueCredentialParams) {
      ensureDemoSeeded();
      await delay(1000);
      const store = useDemoStore.getState();
      const hash = store.nextFakeHash();
      const poseidon = store.nextFakeHash();
      const salt = store.nextFakeHash();
      const root = store.nextFakeHash();
      const claimsHash = store.nextFakeHash();
      const cred: DemoCredential = {
        hash,
        issuer_did: params.issuer_did,
        holder_did: params.holder_did,
        status: "Issued",
        poseidon_commitment: poseidon,
        claims_hash: claimsHash,
        salt,
        nullifier: String(Date.now() % 1_000_000),
        anchored_at: 0,
        on_chain: { status: "PENDING" },
        on_chain_revoked: false,
        credential: {
          credentialSubject: {
            degree: params.credential_subject.degree,
            cgpa: params.credential_subject.cgpa,
            date: params.credential_subject.date,
          },
          trustverseCommitment: buildCommitment(
            params.holder_did,
            params.credential_subject.cgpa,
            params.credential_subject.degree,
            params.credential_subject.date,
            salt,
            root
          ),
        },
      };
      store.addCredential(cred);
      return {
        credential_hash: hash,
        poseidon_commitment: poseidon,
        ipfs_cid: `ipfs://demo/${hash.slice(2, 10)}`,
        status: "issued",
      };
    },

    async markAnchored(credentialHash) {
      ensureDemoSeeded();
      await delay(400);
      useDemoStore.getState().updateCredential(credentialHash, {
        status: "Active",
        anchored_at: Math.floor(Date.now() / 1000),
        on_chain: { status: "ANCHORED" },
      });
    },

    async revokeCredential(params) {
      ensureDemoSeeded();
      await delay(700);
      useDemoStore.getState().updateCredential(params.credential_hash, {
        status: "Revoked",
        on_chain_revoked: true,
      });
    },

    async listHolderCredentials(holderDid) {
      ensureDemoSeeded();
      await delay(500);
      return useDemoStore
        .getState()
        .credentials.filter((c) => c.holder_did === holderDid) as HolderCredential[];
    },

    async listRequests(filter) {
      ensureDemoSeeded();
      await delay(400);
      return useDemoStore
        .getState()
        .requests.filter((r) => {
          if (filter.holderDid && r.holder_did !== filter.holderDid) return false;
          if (filter.verifierDid && r.verifier_did !== filter.verifierDid) return false;
          return true;
        }) as VerifyRequest[];
    },

    async getRequest(id) {
      ensureDemoSeeded();
      const req = useDemoStore
        .getState()
        .requests.find((r) => String(r.id) === String(id));
      if (!req) throw new Error("Request not found");
      return { ...req } as VerifyRequest;
    },

    async createRequest(params) {
      ensureDemoSeeded();
      await delay(700);
      const thresholdScaled = Math.round(params.threshold * 100);
      const req = useDemoStore.getState().addRequest({
        verifier_did: params.verifier_did,
        holder_did: params.holder_did,
        issuer_did: params.issuer_did,
        attribute: params.attribute,
        threshold: thresholdScaled,
        threshold_display: params.threshold,
        status: "pending",
      });
      return { id: req.id, wallet_deep_link: req.wallet_deep_link };
    },

    async getRevocationProof(hash) {
      ensureDemoSeeded();
      await delay(500);
      const cred = useDemoStore.getState().credentials.find((c) => c.hash === hash);
      if (!cred) throw new Error("Could not fetch revocation Merkle path");
      const store = useDemoStore.getState();
      return {
        root: store.nextFakeHash(),
        claimsHash: cred.claims_hash,
        pathElements: Array.from({ length: 8 }, () => store.nextFakeHash()),
        salt: cred.salt,
        revoked: cred.status === "Revoked",
      };
    },

    async submitProof(params) {
      ensureDemoSeeded();
      await delay(600);
      useDemoStore.getState().updateRequest(params.request_id, {
        credential_hash: params.credential_hash,
        claim_tx_hash: params.claim_tx_hash,
        nonrev_tx_hash: params.nonrev_tx_hash,
        block_number: params.block_number,
        result: params.result,
        status: params.result === "pass" ? "fulfilled" : "failed",
      });
    },

    async publicVerify(hash) {
      ensureDemoSeeded();
      await delay(600);
      const formatted = hash.startsWith("0x") ? hash : `0x${hash}`;
      const cred = useDemoStore
        .getState()
        .credentials.find(
          (c) => c.hash.toLowerCase() === formatted.toLowerCase()
        );
      if (!cred || cred.on_chain?.status !== "ANCHORED") {
        return {
          is_valid: false,
          reason: "Not anchored on blockchain",
          data: null,
        } as PublicVerifyResult;
      }
      if (cred.status === "Revoked" || cred.on_chain_revoked) {
        return {
          is_valid: false,
          reason: "Credential has been revoked by issuer",
          data: {
            issuerDID: cred.issuer_did,
            anchoredAt: cred.anchored_at,
            poseidonCommitment: cred.poseidon_commitment,
          },
        };
      }
      return {
        is_valid: true,
        reason: "Valid and active",
        data: {
          issuerDID: cred.issuer_did,
          anchoredAt: cred.anchored_at,
          poseidonCommitment: cred.poseidon_commitment,
        },
      };
    },

    async analyzeForensics(file) {
      ensureDemoSeeded();
      await delay(1500);
      const name = file.name.toLowerCase();
      const forged =
        name.includes("fake") ||
        name.includes("forged") ||
        name.includes("tamper") ||
        file.size % 2 === 1;
      const authenticity_score = forged
        ? 0.28 + (file.size % 20) / 100
        : 0.82 + (file.size % 15) / 100;
      const bytes = new Uint8Array(16);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      }
      const heatmap = await makeElaHeatmap(file);
      return {
        filename: file.name,
        analysis: {
          is_authentic: !forged && authenticity_score >= 0.6,
          authenticity_score: Math.min(0.99, authenticity_score),
          ela_heatmap: heatmap,
          phash: hexFromBytes(bytes),
        },
      } as AnalysisResult;
    },

    async computeTrustScore(_credentialHash, aiScore) {
      ensureDemoSeeded();
      await delay(400);
      const ai_points = Math.round(aiScore * 40);
      const issuer_points = 25;
      const onchain_points = 25;
      const lineage_points = 5;
      return {
        score: ai_points + issuer_points + onchain_points + lineage_points,
        components: { ai_points, issuer_points, onchain_points, lineage_points },
      } as TrustScoreResult;
    },
  };
}

function createDemoChain(): ChainServices {
  return {
    async registerIssuer() {
      await delay(900);
      const block = useDemoStore.getState().nextBlock();
      return {
        hash: useDemoStore.getState().nextFakeHash(),
        blockNumber: block,
      } as TxReceipt;
    },

    async anchorCredential() {
      await delay(1100);
      const block = useDemoStore.getState().nextBlock();
      return {
        hash: useDemoStore.getState().nextFakeHash(),
        blockNumber: block,
      } as TxReceipt;
    },

    async verifyClaimProof() {
      await delay(1000);
      const block = useDemoStore.getState().nextBlock();
      return {
        hash: useDemoStore.getState().nextFakeHash(),
        blockNumber: block,
      } as TxReceipt;
    },

    async verifyNonRevocationProof() {
      await delay(1000);
      const block = useDemoStore.getState().nextBlock();
      return {
        hash: useDemoStore.getState().nextFakeHash(),
        blockNumber: block,
      } as TxReceipt;
    },
  };
}

function createDemoProofs(): ProofServices {
  return {
    async proveClaim(_input: ClaimProofInput) {
      void _input;
      await delay(1600);
      return fakeProof();
    },
    async proveNonRevocation(_input: NonRevProofInput) {
      void _input;
      await delay(1400);
      return fakeProof();
    },
  };
}

export function createDemoServices(): TrustVerseServices {
  ensureDemoSeeded();
  return {
    mode: "demo",
    basePath: "/demo",
    api: createDemoApi(),
    chain: createDemoChain(),
    proofs: createDemoProofs(),
  };
}

/** Helper for portals: evaluate whether a holder's credential would pass a threshold. */
export function demoWouldPass(
  cred: HolderCredential | undefined,
  thresholdScaled: number
): boolean {
  if (!cred || cred.status !== "Active" || cred.on_chain_revoked) return false;
  const cgpa = Number(cred.credential?.credentialSubject?.cgpa ?? 0);
  return Math.round(cgpa * 100) >= thresholdScaled;
}

export { UNIVERSITY_DID };
