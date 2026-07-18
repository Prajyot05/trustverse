from fastapi import APIRouter, HTTPException, Depends
from typing import Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.issuer import IssuerRegistrationRequest, IssuerResponse
from app.db.session import get_db
from app.db.models import Issuer, TrustEvent, EventType
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
        wallet_address=req.wallet_address.lower(),
        metadata_json=req.metadata_json,
        is_active=True
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
        wallet_address=new_issuer.wallet_address,
        is_active=new_issuer.is_active,
        registered_at=new_issuer.registered_at,
        metrics={"issued": 0, "revoked": 0, "verifications": 0} # Mock metrics for now, fetch from on-chain in real
    )

@router.get("/{did}", response_model=IssuerResponse)
def get_issuer_profile(did: str, db: Session = Depends(get_db)) -> Any:
    issuer = db.query(Issuer).filter(Issuer.did == did).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
        
    # In a full app, we would query the Smart Contract for real metrics here
    return IssuerResponse(
        did=issuer.did,
        name=issuer.name,
        wallet_address=issuer.wallet_address,
        is_active=issuer.is_active,
        registered_at=issuer.registered_at,
        metrics={"issued": 0, "revoked": 0, "verifications": 0}
    )
