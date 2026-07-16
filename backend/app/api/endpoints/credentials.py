from fastapi import APIRouter, HTTPException, Depends
from typing import Any

from app.schemas.credential import CredentialIssueRequest, CredentialIssueResponse
from app.services.credential_service import issue_credential

router = APIRouter()

@router.post("/issue", response_model=CredentialIssueResponse)
def issue_new_credential(req: CredentialIssueRequest) -> Any:
    """
    Issues a new W3C Verifiable Credential.
    - Constructs and signs VC
    - Computes Poseidon commitment
    - Encrypts and pins to IPFS
    - Emits event (anchoring happens asynchronously via events)
    """
    try:
        shared_key = bytes.fromhex(req.holder_shared_key_hex)
        if len(shared_key) != 32:
            raise ValueError("Shared key must be 32 bytes")
            
        result = issue_credential(
            issuer_did=req.issuer_did,
            issuer_private_key=req.issuer_private_key,
            holder_did=req.holder_did,
            holder_shared_key=shared_key,
            credential_subject=req.credential_subject,
            schema_id=req.schema_id
        )
        
        return CredentialIssueResponse(
            status=result["status"],
            credential_hash=result["credentialHash"],
            poseidon_commitment=result["poseidonCommitment"],
            ipfs_cid=result["ipfsCid"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
