import { Contract, ethers, type Signer } from "ethers";
import {
  API_URL,
  ADDRESSES,
  ISSUER_REGISTRY_ABI,
  ANCHOR_ABI,
  GATEWAY_ABI,
  toBytes32,
  groth16ToSolidity,
  type Groth16Proof,
} from "@/lib/contracts";
import { createLiveProduct } from "./product-live";
import type {
  ApiServices,
  AnalysisResult,
  ChainServices,
  ClaimProofInput,
  CreateRequestParams,
  HolderCredential,
  IssueCredentialParams,
  IssueCredentialResult,
  IssuedCredential,
  IssuerProfile,
  NonRevProofInput,
  ProofServices,
  PublicVerifyResult,
  RegisterIssuerParams,
  RevocationProof,
  RevokeCredentialParams,
  SubmitProofParams,
  TrustScoreResult,
  TrustVerseServices,
  TxReceipt,
  VerifyRequest,
  VerifyRequestSummary,
} from "./types";

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  return res.statusText || "Request failed";
}

function createLiveApi(): ApiServices {
  return {
    async getIssuer(did) {
      const res = await fetch(`${API_URL}/api/v1/issuers/${encodeURIComponent(did)}`);
      if (!res.ok) return null;
      return (await res.json()) as IssuerProfile;
    },

    async registerIssuer(params: RegisterIssuerParams) {
      const res = await fetch(`${API_URL}/api/v1/issuers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return (await res.json()) as IssuerProfile;
    },

    async listIssuerCredentials(issuerDid) {
      const res = await fetch(
        `${API_URL}/api/v1/credentials/issuer/${encodeURIComponent(issuerDid)}`
      );
      if (!res.ok) return [];
      return (await res.json()) as IssuedCredential[];
    },

    async issueCredential(params: IssueCredentialParams) {
      const res = await fetch(`${API_URL}/api/v1/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return (await res.json()) as IssueCredentialResult;
    },

    async markAnchored(credentialHash, txHash) {
      const res = await fetch(`${API_URL}/api/v1/credentials/${credentialHash}/anchored`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_hash: credentialHash, tx_hash: txHash }),
      });
      if (!res.ok) throw new Error(await parseError(res));
    },

    async revokeCredential(params: RevokeCredentialParams) {
      const res = await fetch(`${API_URL}/api/v1/credentials/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
    },

    async listHolderCredentials(holderDid) {
      const res = await fetch(
        `${API_URL}/api/v1/credentials/holder/${encodeURIComponent(holderDid)}`
      );
      if (!res.ok) return [];
      return (await res.json()) as HolderCredential[];
    },

    async listRequests(filter) {
      const params = new URLSearchParams();
      if (filter.holderDid) params.set("holder_did", filter.holderDid);
      if (filter.verifierDid) params.set("verifier_did", filter.verifierDid);
      const qs = params.toString();
      const res = await fetch(
        `${API_URL}/api/v1/verify/requests${qs ? `?${qs}` : ""}`
      );
      if (!res.ok) return [];
      return (await res.json()) as VerifyRequest[];
    },

    async getRequest(id) {
      const res = await fetch(`${API_URL}/api/v1/verify/requests/${id}`);
      if (!res.ok) throw new Error(await parseError(res));
      return (await res.json()) as VerifyRequest;
    },

    async createRequest(params: CreateRequestParams) {
      const res = await fetch(`${API_URL}/api/v1/verify/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return (await res.json()) as VerifyRequestSummary;
    },

    async getRevocationProof(hash) {
      const res = await fetch(`${API_URL}/api/v1/credentials/revocation/proof/${hash}`);
      if (!res.ok) throw new Error("Could not fetch revocation Merkle path");
      return (await res.json()) as RevocationProof;
    },

    async submitProof(params: SubmitProofParams) {
      const res = await fetch(`${API_URL}/api/v1/verify/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
    },

    async publicVerify(hash) {
      const formatted = hash.startsWith("0x") ? hash : `0x${hash}`;
      const res = await fetch(`${API_URL}/api/v1/verify/${formatted}`);
      if (res.ok) return (await res.json()) as PublicVerifyResult;
      const errorData = await res.json().catch(() => ({}));
      return {
        is_valid: false,
        reason: typeof errorData.detail === "string" ? errorData.detail : "Verification failed",
        data: null,
      };
    },

    async analyzeForensics(file) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/v1/forensics/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      return {
        filename: file.name,
        analysis: data.analysis,
      } as AnalysisResult;
    },

    async computeTrustScore(credentialHash, aiScore) {
      const res = await fetch(`${API_URL}/api/v1/trust-score/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_hash: credentialHash,
          ai_authenticity_score: aiScore,
        }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return (await res.json()) as TrustScoreResult;
    },
  };
}

function requireSigner(signer: Signer | null): Signer {
  if (!signer) throw new Error("Wallet not connected");
  return signer;
}

function createLiveChain(): ChainServices {
  return {
    async registerIssuer(did, metadataHash, signer) {
      if (!ADDRESSES.issuerRegistry) throw new Error("Contract addresses not configured");
      const s = requireSigner(signer);
      const registry = new Contract(ADDRESSES.issuerRegistry, ISSUER_REGISTRY_ABI, s);
      const tx = await registry.selfRegister(did, metadataHash);
      const receipt = await tx.wait();
      return { hash: receipt.hash, blockNumber: receipt.blockNumber } as TxReceipt;
    },

    async anchorCredential(credHash, poseidon, issuerDid, signer) {
      if (!ADDRESSES.credentialAnchor) throw new Error("Contract addresses not configured");
      const s = requireSigner(signer);
      const anchor = new Contract(ADDRESSES.credentialAnchor, ANCHOR_ABI, s);
      const tx = await anchor.anchorCredential(
        toBytes32(credHash),
        toBytes32(poseidon),
        issuerDid,
        ethers.ZeroHash
      );
      const receipt = await tx.wait();
      return { hash: receipt.hash, blockNumber: receipt.blockNumber } as TxReceipt;
    },

    async verifyClaimProof(credHash, proof, signer) {
      if (!ADDRESSES.verificationGateway) throw new Error("Contract addresses not configured");
      const s = requireSigner(signer);
      const gateway = new Contract(ADDRESSES.verificationGateway, GATEWAY_ABI, s);
      const calldata = groth16ToSolidity(proof.proof, proof.publicSignals);
      const tx = await gateway.verifyClaimProof(
        toBytes32(credHash),
        calldata.pA,
        calldata.pB,
        calldata.pC,
        calldata.pubSignals
      );
      const receipt = await tx.wait();
      return { hash: receipt.hash, blockNumber: receipt.blockNumber } as TxReceipt;
    },

    async verifyNonRevocationProof(credHash, proof, signer) {
      if (!ADDRESSES.verificationGateway) throw new Error("Contract addresses not configured");
      const s = requireSigner(signer);
      const gateway = new Contract(ADDRESSES.verificationGateway, GATEWAY_ABI, s);
      const calldata = groth16ToSolidity(proof.proof, proof.publicSignals);
      const tx = await gateway.verifyNonRevocationProof(
        toBytes32(credHash),
        calldata.pA,
        calldata.pB,
        calldata.pC,
        calldata.pubSignals
      );
      const receipt = await tx.wait();
      return { hash: receipt.hash, blockNumber: receipt.blockNumber } as TxReceipt;
    },
  };
}

function createLiveProofs(): ProofServices {
  return {
    async proveClaim(input: ClaimProofInput) {
      const snarkjs = await import("snarkjs");
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input as unknown as Record<string, unknown>,
        "/circuits/ClaimProver.wasm",
        "/circuits/ClaimProver_final.zkey"
      );
      return { proof: proof as Groth16Proof, publicSignals: publicSignals as string[] };
    },

    async proveNonRevocation(input: NonRevProofInput) {
      const snarkjs = await import("snarkjs");
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input as unknown as Record<string, unknown>,
        "/circuits/NonRevocation.wasm",
        "/circuits/NonRevocation_final.zkey"
      );
      return { proof: proof as Groth16Proof, publicSignals: publicSignals as string[] };
    },
  };
}

export function createLiveServices(): TrustVerseServices {
  return {
    mode: "live",
    basePath: "",
    api: createLiveApi(),
    chain: createLiveChain(),
    proofs: createLiveProofs(),
    product: createLiveProduct(),
  };
}
