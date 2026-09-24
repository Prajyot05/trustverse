import type { Signer } from "ethers";
import type { Groth16Proof } from "@/lib/contracts";

export type ServicesMode = "live" | "demo";

export interface IssuerProfile {
  name: string;
  did?: string;
  wallet_address?: string;
  is_active?: boolean;
  domain?: string;
  verified?: boolean;
  accreditation?: string;
  metrics?: { issued?: number; revoked?: number; verifications?: number };
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
  holder_email?: string;
  holder_name?: string;
  expires_at?: string;
  predicate?: string;
  predicate_params?: Record<string, unknown>;
  template_label?: string;
  invite_token?: string;
  invite_link?: string;
  fail_reason?: string;
  discloses?: string[];
  hides?: string[];
  created_at?: string;
}

export interface VerifyRequestSummary {
  id: number | string;
  wallet_deep_link: string;
}

export interface ListRequestsFilter {
  holderDid?: string;
  verifierDid?: string;
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
  holder_email?: string;
  holder_pubkey?: string;
  template_id?: string;
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
  holder_email?: string;
  holder_name?: string;
  expires_in_hours?: number;
  predicate?: string;
  predicate_params?: Record<string, unknown>;
  template_label?: string;
}

export interface SubmitProofParams {
  request_id: number | string;
  credential_hash: string;
  claim_tx_hash: string;
  nonrev_tx_hash: string;
  block_number: number;
  result: string;
  fail_reason?: string;
}

export interface ApiServices {
  getIssuer: (did: string) => Promise<IssuerProfile | null>;
  registerIssuer: (params: RegisterIssuerParams) => Promise<IssuerProfile>;
  listIssuerCredentials: (issuerDid: string) => Promise<IssuedCredential[]>;
  issueCredential: (params: IssueCredentialParams) => Promise<IssueCredentialResult>;
  markAnchored: (credentialHash: string, txHash: string) => Promise<void>;
  revokeCredential: (params: RevokeCredentialParams) => Promise<void>;
  listHolderCredentials: (holderDid: string) => Promise<HolderCredential[]>;
  listRequests: (filter: ListRequestsFilter) => Promise<VerifyRequest[]>;
  getRequest: (id: number | string) => Promise<VerifyRequest>;
  createRequest: (params: CreateRequestParams) => Promise<VerifyRequestSummary>;
  getRevocationProof: (hash: string) => Promise<RevocationProof>;
  submitProof: (params: SubmitProofParams) => Promise<void>;
  publicVerify: (hash: string) => Promise<PublicVerifyResult>;
  analyzeForensics: (file: File) => Promise<AnalysisResult>;
  computeTrustScore: (credentialHash: string, aiScore: number) => Promise<TrustScoreResult>;
}

export interface InboxItem {
  id: number | string;
  recipient_did?: string;
  title: string;
  body?: string;
  kind?: string;
  href?: string;
  read?: boolean;
  created_at?: string;
}

export interface ShareRecord {
  token: string;
  holder_did: string;
  credential_hash?: string;
  predicate?: string;
  expires_at?: string;
  revoked?: boolean;
  label?: string;
  url?: string;
  result?: string;
  fail_reason?: string;
  issuer_name?: string;
  issuer_verified?: boolean;
  disclosed?: Record<string, unknown>;
}

export interface CredentialTemplate {
  id: string;
  issuer_did: string;
  name: string;
  schema_id: string;
  fields: string[];
}

export interface DirectoryIssuer {
  did: string;
  name: string;
  domain?: string;
  verified?: boolean;
  accreditation?: string;
  issued?: number;
}

export interface TrustEventRow {
  id: number;
  event_type: string;
  timestamp?: string;
  actor_did?: string;
  target_did?: string;
  credential_hash?: string;
  payload?: Record<string, unknown>;
}

export interface StaffMember {
  id: number;
  member_did: string;
  role: string;
  email?: string;
}

export interface WebhookRecord {
  id: number;
  url: string;
  events?: string[];
  secret?: string;
}

export interface ApiKeyRecord {
  id: number;
  name: string;
  prefix: string;
  key?: string;
  created_at?: string;
}

export interface PresentationRecord {
  id: string;
  holder_did: string;
  payload?: Record<string, unknown>;
  oid4vp?: Record<string, unknown>;
}

export interface AnalyticsSnapshot {
  issued?: number;
  revoked?: number;
  claimed?: number;
  claim_rate?: number;
  verifications?: number;
  total?: number;
  fulfilled?: number;
  failed?: number;
  pending?: number;
  credentials?: number;
  shares?: number;
  requests?: number;
}

export interface ProductServices {
  listNotifications: (did: string) => Promise<InboxItem[]>;
  markNotificationRead: (id: number | string) => Promise<void>;
  listEvents: (did: string) => Promise<TrustEventRow[]>;
  createShare: (params: {
    holder_did: string;
    credential_hash?: string;
    predicate?: string;
    predicate_params?: Record<string, unknown>;
    expires_in_hours?: number;
    label?: string;
  }) => Promise<ShareRecord>;
  listShares: (holderDid: string) => Promise<ShareRecord[]>;
  getShare: (token: string) => Promise<ShareRecord>;
  revokeShare: (token: string) => Promise<void>;
  listTemplates: (issuerDid: string) => Promise<CredentialTemplate[]>;
  saveTemplate: (t: {
    issuer_did: string;
    name: string;
    schema_id?: string;
    fields?: string[];
  }) => Promise<CredentialTemplate>;
  listDirectory: () => Promise<DirectoryIssuer[]>;
  verifyIssuerDomain: (did: string, domain: string, accreditation?: string) => Promise<DirectoryIssuer>;
  createPresentation: (params: {
    holder_did: string;
    credential_hash?: string;
    request_id?: number | string;
    payload?: Record<string, unknown>;
  }) => Promise<PresentationRecord>;
  getPresentation: (id: string) => Promise<PresentationRecord>;
  getAnalytics: (did: string, role: string) => Promise<AnalyticsSnapshot>;
  listStaff: (issuerDid: string) => Promise<StaffMember[]>;
  addStaff: (params: {
    issuer_did: string;
    member_did: string;
    role: string;
    email?: string;
  }) => Promise<StaffMember>;
  listWebhooks: (did: string) => Promise<WebhookRecord[]>;
  createWebhook: (params: { owner_did: string; url: string }) => Promise<WebhookRecord>;
  listApiKeys: (did: string) => Promise<ApiKeyRecord[]>;
  createApiKey: (did: string, name: string) => Promise<ApiKeyRecord>;
  batchIssue: (params: {
    issuer_did: string;
    issuer_wallet_address: string;
    rows: Array<{
      holder_did?: string;
      holder_email?: string;
      degree: string;
      date: string;
      cgpa: number;
    }>;
  }) => Promise<{ count: number; credentials: Array<{ credential_hash: string; poseidon_commitment: string }> }>;
  relayAnchor: (params: {
    credential_hash: string;
    poseidon_commitment: string;
    issuer_did: string;
  }) => Promise<TxReceipt>;
  listPredicates: () => Promise<Array<{ id: string; label: string }>>;
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
  product: ProductServices;
}

export interface IdentityState {
  address: string | null;
  did: string | null;
  label: string | null;
  signer: Signer | null;
  isConnecting: boolean;
  chainId?: number | null;
  sessionKind?: "metamask" | "embedded" | "demo" | null;
  isWrongNetwork?: boolean;
  connect: () => Promise<void>;
  connectEmbedded?: () => Promise<void>;
  switchNetwork?: () => Promise<void>;
  disconnect: () => void;
  /** Demo-only: select a persona by id. No-op in live mode. */
  selectPersona?: (personaId: string) => void;
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
