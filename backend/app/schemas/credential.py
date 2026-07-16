from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class CredentialIssueRequest(BaseModel):
    issuer_did: str
    holder_did: str
    schema_id: str
    credential_subject: Dict[str, Any]
    # For a real implementation, the issuer private key should not be sent over API
    # It should be managed by a secure KMS. For this boilerplate demo, we accept it.
    issuer_private_key: str
    # Similarly, holder_shared_key is typically established via key exchange
    # We pass it here for simplicity in this demo phase
    holder_shared_key_hex: str

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
    issuer_private_key: str
