from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.schemas.credential import VerificationRequestCreate, ProofIndexRequest
from app.db.session import get_db
from app.db.models import VerificationRequest, Issuer
from app.core.events import event_bus, TrustEventPayload
from app.core.chain import read_anchor, read_revoked
from app.core.notify import notify
from app.core.predicates import catalog_entry

router = APIRouter()


@router.post("/requests")
def create_request(req: VerificationRequestCreate, db: Session = Depends(get_db)) -> Any:
    threshold_scaled = int(round(float(req.threshold) * 100)) if req.threshold else 0
    hours = req.expires_in_hours if req.expires_in_hours is not None else 72
    expires_at = datetime.utcnow() + timedelta(hours=hours) if hours else None
    invite_token = secrets.token_urlsafe(12)
    catalog = catalog_entry(req.predicate)
    row = VerificationRequest(
        verifier_did=req.verifier_did,
        holder_did=req.holder_did,
        issuer_did=req.issuer_did,
        attribute=req.attribute or req.predicate,
        threshold=threshold_scaled,
        status="pending",
        created_at=datetime.utcnow(),
        holder_email=req.holder_email,
        holder_name=req.holder_name,
        expires_at=expires_at,
        predicate=req.predicate,
        predicate_params=req.predicate_params or ({"threshold": req.threshold} if req.predicate == "cgpa_gte" else {}),
        invite_token=invite_token,
        template_label=req.template_label or (catalog["label"] if catalog else None),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    event_bus.publish(
        TrustEventPayload(
            event_type="ProofRequested",
            actor_did=req.verifier_did,
            target_did=req.holder_did or req.holder_email or "",
            payload={"request_id": row.id, "threshold": threshold_scaled, "predicate": req.predicate},
        )
    )
    recipient = req.holder_did or f"email:{req.holder_email or invite_token}"
    notify(
        recipient_did=recipient,
        title="Verification request",
        body=f"A verifier asked you to prove: {row.template_label or req.predicate}.",
        kind="proof_requested",
        href=f"/wallet?request={row.id}",
        email_to=req.holder_email,
    )
    return _serialize(row)


@router.get("/requests")
def list_requests(
    holder_did: Optional[str] = None,
    verifier_did: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Any:
    q = db.query(VerificationRequest)
    if holder_did:
        q = q.filter(VerificationRequest.holder_did == holder_did)
    if verifier_did:
        q = q.filter(VerificationRequest.verifier_did == verifier_did)
    return [_serialize(r) for r in q.order_by(VerificationRequest.id.desc()).all()]


@router.get("/requests/{request_id}")
def get_request(request_id: int, db: Session = Depends(get_db)) -> Any:
    row = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return _serialize(row)


@router.get("/invite/{token}")
def get_request_by_invite(token: str, db: Session = Depends(get_db)) -> Any:
    row = db.query(VerificationRequest).filter(VerificationRequest.invite_token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Invite not found")
    return _serialize(row)


@router.post("/proof")
def index_proof(req: ProofIndexRequest, db: Session = Depends(get_db)) -> Any:
    """
    Indexer: the holder's wallet submits on-chain tx hashes after
    VerificationGateway.verifyClaimProof / verifyNonRevocationProof succeed.
    No mock tx hashes — the wallet must pass real receipts.
    """
    if not req.claim_tx_hash or req.claim_tx_hash.startswith("0xmock"):
        raise HTTPException(status_code=400, detail="Real claim_tx_hash required")

    row = db.query(VerificationRequest).filter(VerificationRequest.id == req.request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    row.credential_hash = req.credential_hash
    row.claim_tx_hash = req.claim_tx_hash
    row.nonrev_tx_hash = req.nonrev_tx_hash
    row.block_number = req.block_number
    row.result = req.result
    row.fail_reason = req.fail_reason
    row.status = "fulfilled" if req.result == "pass" else "failed"
    db.commit()

    issuer_name = None
    if row.issuer_did:
        issuer = db.query(Issuer).filter(Issuer.did == row.issuer_did).first()
        issuer_name = issuer.name if issuer else row.issuer_did

    event_bus.publish(
        TrustEventPayload(
            event_type="VerificationCompleted",
            actor_did=row.verifier_did,
            target_did=row.holder_did or "",
            credential_hash=req.credential_hash,
            payload={"request_id": row.id, "result": req.result, "tx": req.claim_tx_hash, "fail_reason": req.fail_reason},
        )
    )
    notify(
        recipient_did=row.verifier_did,
        title="Proof submitted",
        body=f"Request #{row.id} is {row.status} ({req.result}).",
        kind="proof_submitted",
        href=f"/verifier?request={row.id}",
    )
    return _serialize(row, issuer_name=issuer_name)


@router.get("/{credential_hash}")
def verify_credential_public(credential_hash: str) -> Any:
    try:
        anchor_data = read_anchor(credential_hash)
        if anchor_data.get("status") != "ANCHORED":
            return {"is_valid": False, "reason": "Not anchored on blockchain", "data": None}
        if read_revoked(credential_hash):
            return {"is_valid": False, "reason": "Credential has been revoked by issuer", "data": anchor_data}
        return {"is_valid": True, "reason": "Valid and active", "data": anchor_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _serialize(row: VerificationRequest, issuer_name: str = None) -> dict:
    now = datetime.utcnow()
    status = row.status
    if status == "pending" and row.expires_at and row.expires_at < now:
        status = "expired"
    catalog = catalog_entry(row.predicate or "cgpa_gte")
    return {
        "id": row.id,
        "verifier_did": row.verifier_did,
        "holder_did": row.holder_did,
        "holder_email": row.holder_email,
        "holder_name": row.holder_name,
        "issuer_did": row.issuer_did,
        "issuer_name": issuer_name,
        "attribute": row.attribute,
        "threshold": row.threshold,
        "threshold_display": (row.threshold / 100.0) if row.threshold else 0,
        "status": status,
        "credential_hash": row.credential_hash,
        "claim_tx_hash": row.claim_tx_hash,
        "nonrev_tx_hash": row.nonrev_tx_hash,
        "block_number": row.block_number,
        "result": row.result,
        "fail_reason": row.fail_reason,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "predicate": row.predicate or "cgpa_gte",
        "predicate_params": row.predicate_params,
        "template_label": row.template_label,
        "invite_token": row.invite_token,
        "wallet_deep_link": f"/wallet?request={row.id}",
        "invite_link": f"/wallet?invite={row.invite_token}" if row.invite_token else None,
        "discloses": catalog.get("discloses") if catalog else [],
        "hides": catalog.get("hides") if catalog else [],
    }
