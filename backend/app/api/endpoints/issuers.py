from fastapi import APIRouter, HTTPException, Depends
from typing import Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.issuer import IssuerRegistrationRequest, IssuerResponse
from app.db.session import get_db
from app.db.models import Issuer, TrustEvent, EventType, CredentialRecord, VerificationRequest
from app.core.events import event_bus, TrustEventPayload

router = APIRouter()

@router.post("/register", response_model=IssuerResponse)
def register_issuer(req: IssuerRegistrationRequest, db: Session = Depends(get_db)) -> Any:
    """
    Register a new institution as an issuer.
    In a real app, this would require approval or on-chain transaction verification.
    """
    issuer = db.query(Issuer).filter(Issuer.did == req.did).first()
    if issuer:
        raise HTTPException(status_code=400, detail="Issuer with this DID already exists")

    new_issuer = Issuer(
        did=req.did,
        name=req.name,
        eth_address=req.wallet_address.lower(),
        metadata_json=req.metadata_json,
        is_active=True,
        domain=req.domain,
        accreditation=req.accreditation,
        verified=False,
    )
    db.add(new_issuer)
    db.commit()
    db.refresh(new_issuer)

    event = TrustEventPayload(
        event_type=EventType.ISSUER_REGISTERED.value,
        actor_did=req.did,
        payload={"wallet": req.wallet_address, "name": req.name}
    )
    event_bus.publish(event)

    return IssuerResponse(
        did=new_issuer.did,
        name=new_issuer.name,
        wallet_address=new_issuer.eth_address,
        is_active=new_issuer.is_active,
        registered_at=new_issuer.registered_at,
        metrics={"issued": 0, "revoked": 0, "verifications": 0},
        domain=new_issuer.domain,
        verified=False,
        accreditation=new_issuer.accreditation,
    )


@router.get("/")
def list_issuers(db: Session = Depends(get_db)) -> Any:
    rows = db.query(Issuer).all()
    return [
        {
            "did": i.did,
            "name": i.name,
            "wallet_address": i.eth_address,
            "is_active": i.is_active,
            "domain": i.domain,
            "verified": bool(i.verified),
            "accreditation": i.accreditation,
        }
        for i in rows
    ]


@router.get("/{did:path}", response_model=IssuerResponse)
def get_issuer_profile(did: str, db: Session = Depends(get_db)) -> Any:
    issuer = db.query(Issuer).filter(Issuer.did == did).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
        
    return IssuerResponse(
        did=issuer.did,
        name=issuer.name,
        wallet_address=issuer.eth_address,
        is_active=issuer.is_active,
        registered_at=issuer.registered_at,
        metrics=_issuer_metrics(db, issuer.did),
        domain=issuer.domain,
        verified=bool(issuer.verified),
        accreditation=issuer.accreditation,
    )


def _issuer_metrics(db: Session, did: str) -> dict:
    issued = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == did).count()
    revoked = db.query(CredentialRecord).filter(
        CredentialRecord.issuer_did == did, CredentialRecord.status == "Revoked"
    ).count()
    verifications = db.query(VerificationRequest).filter(
        VerificationRequest.issuer_did == did
    ).count()
    return {"issued": issued, "revoked": revoked, "verifications": verifications}
