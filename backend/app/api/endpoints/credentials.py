from fastapi import APIRouter, HTTPException, Depends
from typing import Any, List
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.credential import CredentialIssueRequest, CredentialIssueResponse, RevocationRequest
from app.services.credential_service import issue_credential
from app.db.session import get_db
from app.db.models import CredentialRecord

router = APIRouter()

@router.post("/issue", response_model=CredentialIssueResponse)
def issue_new_credential(req: CredentialIssueRequest, db: Session = Depends(get_db)) -> Any:
    """
    Issues a new W3C Verifiable Credential.
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
        
        # Save to local DB for fast querying
        record = CredentialRecord(
            hash=result["credentialHash"],
            issuer_did=req.issuer_did,
            holder_did=req.holder_did,
            status="Active",
            ipfs_cid=result["ipfsCid"],
            anchored_at=datetime.utcnow()
        )
        db.add(record)
        db.commit()
        
        return CredentialIssueResponse(
            status=result["status"],
            credential_hash=result["credentialHash"],
            poseidon_commitment=result["poseidonCommitment"],
            ipfs_cid=result["ipfsCid"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/holder/{holder_did}")
def get_holder_credentials(holder_did: str, db: Session = Depends(get_db)) -> Any:
    """Fetch all credentials for a specific holder"""
    records = db.query(CredentialRecord).filter(CredentialRecord.holder_did == holder_did).all()
    return [{
        "hash": r.hash,
        "issuer_did": r.issuer_did,
        "status": r.status,
        "ipfs_cid": r.ipfs_cid,
        "anchored_at": r.anchored_at
    } for r in records]

@router.get("/issuer/{issuer_did}")
def get_issuer_credentials(issuer_did: str, db: Session = Depends(get_db)) -> Any:
    """Fetch all credentials issued by a specific issuer"""
    records = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == issuer_did).all()
    return [{
        "hash": r.hash,
        "holder_did": r.holder_did,
        "status": r.status,
        "ipfs_cid": r.ipfs_cid,
        "anchored_at": r.anchored_at
    } for r in records]

@router.post("/revoke")
def revoke_credential(req: RevocationRequest, db: Session = Depends(get_db)) -> Any:
    """
    Propose a revocation on-chain.
    """
    record = db.query(CredentialRecord).filter(CredentialRecord.hash == req.credential_hash).first()
    if not record:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    # Here we would interact with RevocationRegistry on-chain
    # For now, update local status
    record.status = "Revoked"
    db.commit()
    
    return {"status": "success", "message": "Credential revoked"}

