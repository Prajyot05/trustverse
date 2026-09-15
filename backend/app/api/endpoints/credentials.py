from fastapi import APIRouter, HTTPException, Depends
from typing import Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.credential import (
    CredentialIssueRequest,
    CredentialIssueResponse,
    RevocationRequest,
    AnchorConfirmRequest,
)
from app.services.credential_service import issue_credential
from app.core.crypto import holder_encryption_key, decrypt_credential
from app.core.revocation_tree import mark_revoked, proof_for_nullifier, current_root
from app.core.chain import read_anchor, read_revoked
from app.db.session import get_db
from app.db.models import CredentialRecord, Issuer

router = APIRouter()


@router.post("/issue", response_model=CredentialIssueResponse)
def issue_new_credential(req: CredentialIssueRequest, db: Session = Depends(get_db)) -> Any:
    try:
        shared_key = None
        if req.holder_shared_key_hex:
            shared_key = bytes.fromhex(req.holder_shared_key_hex)
            if len(shared_key) != 32:
                raise ValueError("Shared key must be 32 bytes")

        result = issue_credential(
            issuer_did=req.issuer_did,
            holder_did=req.holder_did,
            credential_subject=req.credential_subject,
            schema_id=req.schema_id,
            issuer_wallet_address=req.issuer_wallet_address,
            issuer_private_key=req.issuer_private_key,
            holder_shared_key=shared_key,
        )

        record = CredentialRecord(
            hash=result["credentialHash"],
            issuer_did=req.issuer_did,
            holder_did=req.holder_did,
            status="Issued",
            ipfs_cid=result["ipfsCid"],
            poseidon_commitment=result["poseidonCommitment"],
            encrypted_blob=result["encrypted"],
            issuer_wallet=result["issuerWallet"],
            claims_hash=result["claimsHash"],
            salt=result["salt"],
            nullifier=result["nullifier"],
        )
        db.add(record)
        db.commit()

        return CredentialIssueResponse(
            status=result["status"],
            credential_hash=result["credentialHash"],
            poseidon_commitment=result["poseidonCommitment"],
            ipfs_cid=result["ipfsCid"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{credential_hash}/anchored")
def confirm_anchor(credential_hash: str, req: AnchorConfirmRequest, db: Session = Depends(get_db)) -> Any:
    record = db.query(CredentialRecord).filter(CredentialRecord.hash == credential_hash).first()
    if not record:
        raise HTTPException(status_code=404, detail="Credential not found")
    record.status = "Active"
    record.anchor_tx_hash = req.tx_hash
    record.anchored_at = datetime.utcnow()
    db.commit()
    return {"status": "Active", "tx_hash": req.tx_hash}


def _decorate(record: CredentialRecord, include_plaintext: bool = False) -> dict:
    payload = {
        "hash": record.hash,
        "issuer_did": record.issuer_did,
        "holder_did": record.holder_did,
        "status": record.status,
        "ipfs_cid": record.ipfs_cid,
        "anchored_at": record.anchored_at,
        "poseidon_commitment": record.poseidon_commitment,
        "anchor_tx_hash": record.anchor_tx_hash,
        "encrypted_blob": record.encrypted_blob,
    }
    chain = read_anchor(record.hash)
    payload["on_chain"] = chain
    payload["on_chain_revoked"] = read_revoked(record.hash)
    if include_plaintext and record.encrypted_blob and record.holder_did:
        try:
            key = holder_encryption_key(record.holder_did)
            payload["credential"] = decrypt_credential(record.encrypted_blob, key)
        except Exception:
            payload["credential"] = None
    return payload


@router.get("/holder/{holder_did}")
def get_holder_credentials(holder_did: str, db: Session = Depends(get_db)) -> Any:
    records = db.query(CredentialRecord).filter(CredentialRecord.holder_did == holder_did).all()
    return [_decorate(r, include_plaintext=True) for r in records]


@router.get("/issuer/{issuer_did}")
def get_issuer_credentials(issuer_did: str, db: Session = Depends(get_db)) -> Any:
    # Issuers already authored these credentials; surface plaintext so the
    # portal can show degree / holder context instead of hashes alone.
    records = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == issuer_did).all()
    return [_decorate(r, include_plaintext=True) for r in records]


@router.post("/revoke")
def revoke_credential(req: RevocationRequest, db: Session = Depends(get_db)) -> Any:
    record = db.query(CredentialRecord).filter(CredentialRecord.hash == req.credential_hash).first()
    if not record:
        raise HTTPException(status_code=404, detail="Credential not found")
    if not record.nullifier:
        raise HTTPException(status_code=400, detail="Credential has no nullifier; re-issue required")

    record.status = "Revoked"
    db.commit()
    root = mark_revoked(int(record.nullifier))
    return {
        "status": "revoked",
        "message": "Credential marked revoked; Merkle root published",
        "revocationTreeRoot": root,
        "reason_code": req.reason_code,
        "details": req.details,
    }


@router.get("/revocation/proof/{credential_hash}")
def get_nonrevocation_proof(credential_hash: str, db: Session = Depends(get_db)) -> Any:
    record = db.query(CredentialRecord).filter(CredentialRecord.hash == credential_hash).first()
    if not record or not record.nullifier:
        raise HTTPException(status_code=404, detail="Credential or nullifier not found")
    proof = proof_for_nullifier(int(record.nullifier))
    proof["claimsHash"] = record.claims_hash
    proof["salt"] = record.salt
    proof["revoked"] = record.status == "Revoked"
    return proof


@router.get("/revocation/root")
def get_revocation_root() -> Any:
    return {"root": current_root()}
