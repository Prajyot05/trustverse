import type { Signer } from "ethers";
import type { Groth16Proof } from "@/lib/contracts";

export type ServicesMode = "live" | "demo";

export interface IssuerProfile {
  name: string;
  did?: string;
  wallet_address?: string;
  is_active?: boolean;
}

export interface IssuedCredential {
  hash: string;
  holder_did: string;
  status: "Active" | "Revoked" | string;
  on_chain?: { status?: string };
  /** Plaintext subject when the issuer (or demo store) can surface it. */
  credential?: {
    credentialSubject?: { degree?: string; cgpa?: number | string; date?: string };
  };
}

export interface TrustverseCommitment {
  credentialRoot: string;
  subjectId: string;
  cgpaScaled: string;
  degreeCode: string;
  issueDate: string;
  issuerPubKey: string;
  salt: string;
  schemaId: string;
}

export interface HolderCredential {
  hash: string;
  issuer_did: string;
  holder_did?: string;
  status: string;
  on_chain?: { status?: string };
  on_chain_revoked?: boolean;
  poseidon_commitment?: string;
  credential?: {
    credentialSubject?: { degree?: string; cgpa?: number | string; date?: string };
    trustverseCommitment?: TrustverseCommitment;
  };
}

export interface VerifyRequest {
  id: number | string;
  status: string;
  threshold: number;
  threshold_display: string | number;
  issuer_did?: string;
  holder_did?: string;
  verifier_did?: string;
  wallet_deep_link?: string;
  claim_tx_hash?: string;
  nonrev_tx_hash?: string;
  block_number?: number;
  result?: string;
  credential_hash?: string;
}

export interface VerifyRequestSummary {
  id: number | string;
  wallet_deep_link: string;
}

export interface PollStatus {
  status: "pending" | "fulfilled" | "failed" | string;
  block_number?: number;
  claim_tx_hash?: string;
  nonrev_tx_hash?: string;
  result?: string;
}

export interface IssueCredentialResult {
  credential_hash: string;
  poseidon_commitment: string;
  ipfs_cid?: string;
  status?: string;
}

export interface RevocationProof {
  root: string;
  claimsHash: string;
  pathElements: string[];
  salt?: string;
  revoked?: boolean;
}

export interface ForensicsAnalysis {
  is_authentic: boolean;
  authenticity_score: number;
  ela_heatmap?: string;
  phash: string;
}

export interface AnalysisResult {
  filename: string;
  analysis: ForensicsAnalysis;
}

export interface TrustScoreResult {
  score: number;
  components?: {
    ai_points: number;
    issuer_points: number;
    onchain_points: number;
    lineage_points: number;
  };
}

export interface PublicVerifyResult {
  is_valid: boolean;
  reason?: string;
  data?: {
    issuerDID: string;
    anchoredAt: number;
    poseidonCommitment: string;
  } | null;
}

export interface TxReceipt {
  hash: string;
  blockNumber: number;
}

export interface ClaimProofInput {
  credentialRoot: string;
  threshold: string;
  subjectId: string;
  cgpaScaled: string;
  degreeCode: string;
  issueDate: string;
  issuerPubKey: string;
  salt: string;
  schemaId: string;
}

export interface NonRevProofInput {
  credentialRoot: string;
  revocationTreeRoot: string;
  claimsHash: string;
  issuerPubKey: string;
  salt: string;
  schemaId: string;
  pathElements: string[];
}

export interface ProofBundle {
  proof: Groth16Proof;
  publicSignals: string[];
}

export interface RegisterIssuerParams {
  did: string;
  wallet_address: string;
  name: string;
  metadata_json?: Record<string, unknown>;
}

export interface IssueCredentialParams {
  issuer_did: string;
  holder_did: string;
  schema_id: string;
  credential_subject: {
    degree: string;
    date: string;
    cgpa: number;
  };
  issuer_wallet_address: string;
}

export interface RevokeCredentialParams {
  issuer_did: string;
  credential_hash: string;
  reason_code: number;
  details: string;
}

export interface CreateRequestParams {
  verifier_did: string;
  holder_did?: string;
  issuer_did?: string;
  attribute: string;
  threshold: number;
}

export interface SubmitProofParams {
  request_id: number | string;
  credential_hash: string;
  claim_tx_hash: string;
  nonrev_tx_hash: string;
  block_number: number;
  result: string;
}

export interface ApiServices {
  getIssuer: (did: string) => Promise<IssuerProfile | null>;
  registerIssuer: (params: RegisterIssuerParams) => Promise<IssuerProfile>;
  listIssuerCredentials: (issuerDid: string) => Promise<IssuedCredential[]>;
  issueCredential: (params: IssueCredentialParams) => Promise<IssueCredentialResult>;
  markAnchored: (credentialHash: string, txHash: string) => Promise<void>;
  revokeCredential: (params: RevokeCredentialParams) => Promise<void>;
  listHolderCredentials: (holderDid: string) => Promise<HolderCredential[]>;
  listRequests: (holderDid: string) => Promise<VerifyRequest[]>;
  getRequest: (id: number | string) => Promise<PollStatus>;
  createRequest: (params: CreateRequestParams) => Promise<VerifyRequestSummary>;
  getRevocationProof: (hash: string) => Promise<RevocationProof>;
  submitProof: (params: SubmitProofParams) => Promise<void>;
  publicVerify: (hash: string) => Promise<PublicVerifyResult>;
  analyzeForensics: (file: File) => Promise<AnalysisResult>;
  computeTrustScore: (credentialHash: string, aiScore: number) => Promise<TrustScoreResult>;
}

export interface ChainServices {
  registerIssuer: (did: string, metadataHash: string, signer: Signer | null) => Promise<TxReceipt>;
  anchorCredential: (
    credHash: string,
    poseidon: string,
    issuerDid: string,
    signer: Signer | null
  ) => Promise<TxReceipt>;
  verifyClaimProof: (
    credHash: string,
    proof: ProofBundle,
    signer: Signer | null
  ) => Promise<TxReceipt>;
  verifyNonRevocationProof: (
    credHash: string,
    proof: ProofBundle,
    signer: Signer | null
  ) => Promise<TxReceipt>;
}

export interface ProofServices {
  proveClaim: (input: ClaimProofInput) => Promise<ProofBundle>;
  proveNonRevocation: (input: NonRevProofInput) => Promise<ProofBundle>;
}

export interface TrustVerseServices {
  mode: ServicesMode;
  basePath: "" | "/demo";
  api: ApiServices;
  chain: ChainServices;
  proofs: ProofServices;
}

export interface IdentityState {
  address: string | null;
  did: string | null;
  label: string | null;
  signer: Signer | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Demo-only: select a persona by id. No-op in live mode. */
  selectPersona?: (personaId: string) => void;
}
