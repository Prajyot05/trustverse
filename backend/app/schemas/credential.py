from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class CredentialIssueRequest(BaseModel):
    issuer_did: str
    holder_did: str
    schema_id: str
    credential_subject: Dict[str, Any]
    issuer_wallet_address: str
    # Optional: only used by demo seed. Live issuance signs the on-chain
    # anchor in MetaMask and does not send a private key.
    issuer_private_key: Optional[str] = None
    holder_shared_key_hex: Optional[str] = None
    holder_email: Optional[str] = None
    holder_pubkey: Optional[str] = None
    template_id: Optional[str] = None
    claim_invite: bool = True

class CredentialIssueResponse(BaseModel):
    status: str
    credential_hash: str
    poseidon_commitment: str
    ipfs_cid: str

class CredentialVerifyRequest(BaseModel):
    credential_hash: str

class RevocationRequest(BaseModel):
    issuer_did: str
    credential_hash: str
    reason_code: int
    details: str

class AnchorConfirmRequest(BaseModel):
    credential_hash: str
    tx_hash: str

class VerificationRequestCreate(BaseModel):
    verifier_did: str
    holder_did: Optional[str] = None
    issuer_did: Optional[str] = None
    attribute: str = "cgpa"
    threshold: float = 0.0  # e.g. 8.0; stored as cgpaScaled int
    holder_email: Optional[str] = None
    holder_name: Optional[str] = None
    expires_in_hours: Optional[int] = 72
    predicate: str = "cgpa_gte"
    predicate_params: Optional[Dict[str, Any]] = None
    template_label: Optional[str] = None

class ProofIndexRequest(BaseModel):
    request_id: int
    credential_hash: str
    claim_tx_hash: str
    nonrev_tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    result: str = "pass"
    fail_reason: Optional[str] = None
    public_signals: Optional[list] = None
