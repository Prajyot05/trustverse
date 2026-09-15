"""Product-layer APIs: inbox, directory, shares, templates, staff, keys, webhooks, analytics, presentations, batch, relay."""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Optional
import hashlib
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    ApiKey,
    CredentialRecord,
    CredentialTemplate,
    Issuer,
    Notification,
    Presentation,
    ShareLink,
    StaffMember,
    TrustEvent,
    VerificationRequest,
    Webhook,
)
from app.core.events import event_bus, TrustEventPayload
from app.core.notify import notify
from app.core.predicates import PREDICATE_CATALOG, evaluate_predicate
from app.core.crypto import decrypt_credential, holder_encryption_key
from app.services.credential_service import issue_credential

router = APIRouter()


class ShareCreate(BaseModel):
    holder_did: str
    credential_hash: Optional[str] = None
    predicate: str = "graduated"
    predicate_params: Optional[dict] = None
    expires_in_hours: int = 168
    label: Optional[str] = None


class TemplateSave(BaseModel):
    issuer_did: str
    name: str
    schema_id: str = "degree-v1"
    fields: Optional[list] = None
    id: Optional[str] = None


class DomainVerify(BaseModel):
    did: str
    domain: str
    accreditation: Optional[str] = None


class PresentationCreate(BaseModel):
    holder_did: str
    verifier_did: Optional[str] = None
    credential_hash: Optional[str] = None
    request_id: Optional[int] = None
    payload: Optional[dict] = None


class StaffAdd(BaseModel):
    issuer_did: str
    member_did: str
    role: str = "viewer"
    email: Optional[str] = None


class WebhookCreate(BaseModel):
    owner_did: str
    url: str
    events: Optional[list] = None


class ApiKeyCreate(BaseModel):
    owner_did: str
    name: str


class BatchIssueItem(BaseModel):
    holder_did: Optional[str] = None
    holder_email: Optional[str] = None
    degree: str
    date: str
    cgpa: float


class BatchIssueRequest(BaseModel):
    issuer_did: str
    issuer_wallet_address: str
    schema_id: str = "degree-v1"
    template_id: Optional[str] = None
    rows: list[BatchIssueItem]


class RelayAnchorRequest(BaseModel):
    credential_hash: str
    poseidon_commitment: str
    issuer_did: str


@router.get("/predicates")
def list_predicates() -> Any:
    return PREDICATE_CATALOG


@router.get("/notifications")
def list_notifications(did: str, db: Session = Depends(get_db)) -> Any:
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_did == did)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "kind": n.kind,
            "href": n.href,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db)) -> Any:
    row = db.query(Notification).filter(Notification.id == notification_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.read = True
    db.commit()
    return {"status": "ok"}


@router.get("/events")
def list_events(
    actor_did: Optional[str] = None,
    target_did: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> Any:
    q = db.query(TrustEvent)
    if actor_did:
        q = q.filter((TrustEvent.actor_did == actor_did) | (TrustEvent.target_did == actor_did))
    if target_did:
        q = q.filter(TrustEvent.target_did == target_did)
    rows = q.order_by(TrustEvent.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "actor_did": e.actor_did,
            "target_did": e.target_did,
            "credential_hash": e.credential_hash,
            "payload": e.payload,
        }
        for e in rows
    ]


@router.post("/shares")
def create_share(req: ShareCreate, db: Session = Depends(get_db)) -> Any:
    token = secrets.token_urlsafe(18)
    row = ShareLink(
        token=token,
        holder_did=req.holder_did,
        credential_hash=req.credential_hash,
        predicate=req.predicate,
        predicate_params=req.predicate_params,
        expires_at=datetime.utcnow() + timedelta(hours=req.expires_in_hours),
        label=req.label,
    )
    db.add(row)
    db.commit()
    event_bus.publish(
        TrustEventPayload(
            event_type="ShareCreated",
            actor_did=req.holder_did,
            credential_hash=req.credential_hash or "",
            payload={"token": token, "predicate": req.predicate},
        )
    )
    return _share_json(row)


@router.get("/shares")
def list_shares(holder_did: str, db: Session = Depends(get_db)) -> Any:
    rows = db.query(ShareLink).filter(ShareLink.holder_did == holder_did).order_by(ShareLink.created_at.desc()).all()
    return [_share_json(r) for r in rows]


@router.get("/shares/{token}")
def get_share(token: str, db: Session = Depends(get_db)) -> Any:
    row = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found")
    if row.revoked:
        raise HTTPException(status_code=410, detail="Share revoked")
    if row.expires_at and row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share expired")
    payload = _share_json(row)
    if row.credential_hash:
        cred = db.query(CredentialRecord).filter(CredentialRecord.hash == row.credential_hash).first()
        if cred:
            issuer = db.query(Issuer).filter(Issuer.did == cred.issuer_did).first()
            payload["credential_status"] = cred.status
            payload["issuer_did"] = cred.issuer_did
            payload["issuer_name"] = issuer.name if issuer else cred.issuer_did
            payload["issuer_verified"] = bool(issuer.verified) if issuer else False
            try:
                key = holder_encryption_key(cred.holder_did, cred.holder_pubkey)
                subject = decrypt_credential(cred.encrypted_blob, key).get("credentialSubject", {})
            except Exception:
                subject = {}
            ok, reason = evaluate_predicate(
                row.predicate or "graduated",
                row.predicate_params,
                subject,
                cred.issuer_did,
                cred.status,
            )
            payload["result"] = "pass" if ok else "fail"
            payload["fail_reason"] = None if ok else reason
            payload["disclosed"] = {
                "issuer": payload["issuer_name"],
                "predicate": row.predicate,
                "pass": ok,
            }
    return payload


@router.post("/shares/{token}/revoke")
def revoke_share(token: str, db: Session = Depends(get_db)) -> Any:
    row = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found")
    row.revoked = True
    db.commit()
    return {"status": "revoked"}


@router.get("/templates")
def list_templates(issuer_did: str, db: Session = Depends(get_db)) -> Any:
    rows = db.query(CredentialTemplate).filter(CredentialTemplate.issuer_did == issuer_did).all()
    if not rows:
        default = CredentialTemplate(
            id=str(uuid.uuid4()),
            issuer_did=issuer_did,
            name="Academic degree",
            schema_id="degree-v1",
            fields_json=["degree", "date", "cgpa"],
        )
        db.add(default)
        db.commit()
        db.refresh(default)
        rows = [default]
    return [_template_json(t) for t in rows]


@router.post("/templates")
def save_template(req: TemplateSave, db: Session = Depends(get_db)) -> Any:
    tid = req.id or str(uuid.uuid4())
    row = db.query(CredentialTemplate).filter(CredentialTemplate.id == tid).first()
    if row:
        row.name = req.name
        row.schema_id = req.schema_id
        row.fields_json = req.fields or ["degree", "date", "cgpa"]
    else:
        row = CredentialTemplate(
            id=tid,
            issuer_did=req.issuer_did,
            name=req.name,
            schema_id=req.schema_id,
            fields_json=req.fields or ["degree", "date", "cgpa"],
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _template_json(row)


@router.get("/directory")
def issuer_directory(db: Session = Depends(get_db)) -> Any:
    rows = db.query(Issuer).filter(Issuer.is_active == True).all()  # noqa: E712
    out = []
    for i in rows:
        issued = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == i.did).count()
        out.append(
            {
                "did": i.did,
                "name": i.name,
                "wallet_address": i.eth_address,
                "domain": i.domain,
                "verified": bool(i.verified),
                "accreditation": i.accreditation,
                "issued": issued,
            }
        )
    return out


@router.post("/directory/verify")
def verify_issuer_domain(req: DomainVerify, db: Session = Depends(get_db)) -> Any:
    issuer = db.query(Issuer).filter(Issuer.did == req.did).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
    domain = req.domain.strip().lower().replace("https://", "").replace("http://", "").split("/")[0]
    issuer.domain = domain
    issuer.verified = True
    if req.accreditation:
        issuer.accreditation = req.accreditation
    db.commit()
    event_bus.publish(
        TrustEventPayload(
            event_type="IssuerVerified",
            actor_did=req.did,
            payload={"domain": domain, "accreditation": issuer.accreditation},
        )
    )
    return {
        "did": issuer.did,
        "domain": issuer.domain,
        "verified": True,
        "accreditation": issuer.accreditation,
        "did_web": f"did:web:{domain}",
    }


@router.post("/presentations")
def create_presentation(req: PresentationCreate, db: Session = Depends(get_db)) -> Any:
    pid = str(uuid.uuid4())
    payload = req.payload or {}
    payload.setdefault("@context", ["https://www.w3.org/ns/credentials/v2"])
    payload.setdefault("type", ["VerifiablePresentation"])
    payload["holder"] = req.holder_did
    row = Presentation(
        id=pid,
        holder_did=req.holder_did,
        verifier_did=req.verifier_did,
        credential_hash=req.credential_hash,
        request_id=req.request_id,
        payload=payload,
    )
    db.add(row)
    db.commit()
    event_bus.publish(
        TrustEventPayload(
            event_type="PresentationCreated",
            actor_did=req.holder_did,
            target_did=req.verifier_did or "",
            credential_hash=req.credential_hash or "",
            payload={"id": pid},
        )
    )
    return _presentation_json(row)


@router.get("/presentations/{presentation_id}")
def get_presentation(presentation_id: str, db: Session = Depends(get_db)) -> Any:
    row = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return _presentation_json(row)


@router.get("/analytics")
def analytics(did: str, role: str = "issuer", db: Session = Depends(get_db)) -> Any:
    if role == "issuer":
        issued = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == did).count()
        revoked = db.query(CredentialRecord).filter(
            CredentialRecord.issuer_did == did, CredentialRecord.status == "Revoked"
        ).count()
        claimed = db.query(CredentialRecord).filter(
            CredentialRecord.issuer_did == did, CredentialRecord.claimed_at.isnot(None)
        ).count()
        verifications = db.query(VerificationRequest).filter(VerificationRequest.issuer_did == did).count()
        return {
            "issued": issued,
            "revoked": revoked,
            "claimed": claimed,
            "claim_rate": (claimed / issued) if issued else 0,
            "verifications": verifications,
        }
    if role == "verifier":
        rows = db.query(VerificationRequest).filter(VerificationRequest.verifier_did == did).all()
        fulfilled = sum(1 for r in rows if r.status == "fulfilled")
        failed = sum(1 for r in rows if r.status == "failed")
        pending = sum(1 for r in rows if r.status == "pending")
        return {
            "total": len(rows),
            "fulfilled": fulfilled,
            "failed": failed,
            "pending": pending,
            "time_to_verify_hint": "Polling-based; median computed when timestamps exist",
        }
    holder_creds = db.query(CredentialRecord).filter(CredentialRecord.holder_did == did).count()
    shares = db.query(ShareLink).filter(ShareLink.holder_did == did).count()
    requests = db.query(VerificationRequest).filter(VerificationRequest.holder_did == did).count()
    return {"credentials": holder_creds, "shares": shares, "requests": requests}


@router.get("/staff")
def list_staff(issuer_did: str, db: Session = Depends(get_db)) -> Any:
    rows = db.query(StaffMember).filter(StaffMember.issuer_did == issuer_did).all()
    return [
        {
            "id": s.id,
            "member_did": s.member_did,
            "role": s.role,
            "email": s.email,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in rows
    ]


@router.post("/staff")
def add_staff(req: StaffAdd, db: Session = Depends(get_db)) -> Any:
    if req.role not in ("admin", "registrar", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    row = StaffMember(
        issuer_did=req.issuer_did,
        member_did=req.member_did,
        role=req.role,
        email=req.email,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "member_did": row.member_did,
        "role": row.role,
        "email": row.email,
    }


@router.get("/webhooks")
def list_webhooks(owner_did: str, db: Session = Depends(get_db)) -> Any:
    rows = db.query(Webhook).filter(Webhook.owner_did == owner_did).all()
    return [
        {"id": w.id, "url": w.url, "events": w.events, "created_at": w.created_at.isoformat() if w.created_at else None}
        for w in rows
    ]


@router.post("/webhooks")
def create_webhook(req: WebhookCreate, db: Session = Depends(get_db)) -> Any:
    row = Webhook(
        owner_did=req.owner_did,
        url=req.url,
        events=req.events or ["VerificationCompleted", "CredentialIssued"],
        secret=secrets.token_urlsafe(24),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "url": row.url, "events": row.events, "secret": row.secret}


@router.get("/keys")
def list_keys(owner_did: str, db: Session = Depends(get_db)) -> Any:
    rows = db.query(ApiKey).filter(ApiKey.owner_did == owner_did).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in rows
    ]


@router.post("/keys")
def create_key(req: ApiKeyCreate, db: Session = Depends(get_db)) -> Any:
    raw = "tv_" + secrets.token_urlsafe(24)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    row = ApiKey(
        owner_did=req.owner_did,
        name=req.name,
        prefix=raw[:10],
        hashed_key=hashed,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name, "prefix": row.prefix, "key": raw}


@router.post("/credentials/batch")
def batch_issue(req: BatchIssueRequest, db: Session = Depends(get_db)) -> Any:
    issued = []
    for row in req.rows:
        holder_did = row.holder_did or (f"did:email:{row.holder_email}" if row.holder_email else None)
        if not holder_did:
            continue
        result = issue_credential(
            issuer_did=req.issuer_did,
            holder_did=holder_did,
            credential_subject={"degree": row.degree, "date": row.date, "cgpa": row.cgpa},
            schema_id=req.schema_id,
            issuer_wallet_address=req.issuer_wallet_address,
        )
        claim_token = secrets.token_urlsafe(16)
        rec = CredentialRecord(
            hash=result["credentialHash"],
            issuer_did=req.issuer_did,
            holder_did=holder_did,
            status="Issued",
            ipfs_cid=result["ipfsCid"],
            poseidon_commitment=result["poseidonCommitment"],
            encrypted_blob=result["encrypted"],
            issuer_wallet=result["issuerWallet"],
            claims_hash=result["claimsHash"],
            salt=result["salt"],
            nullifier=result["nullifier"],
            holder_email=row.holder_email,
            claim_token=claim_token,
            template_id=req.template_id,
            enc_scheme=result.get("encScheme"),
        )
        db.add(rec)
        notify(
            recipient_did=holder_did,
            title="Claim your academic credential",
            body=f"Your institution issued a {row.degree} credential. Open TrustVerse to claim it.",
            kind="claim_invite",
            href=f"/wallet?claim={claim_token}",
            email_to=row.holder_email,
        )
        issued.append(
            {
                "credential_hash": rec.hash,
                "poseidon_commitment": rec.poseidon_commitment,
                "holder_did": holder_did,
                "claim_token": claim_token,
            }
        )
    db.commit()
    return {"count": len(issued), "credentials": issued}


@router.post("/relay/anchor")
def relay_anchor(req: RelayAnchorRequest) -> Any:
    from app.core.chain import anchor_on_chain

    result = anchor_on_chain(req.credential_hash, req.poseidon_commitment, req.issuer_did)
    if result.get("status") != "ok":
        raise HTTPException(status_code=400, detail=result.get("reason") or result.get("status") or "Relay failed")
    return {
        "hash": result.get("txHash"),
        "blockNumber": result.get("blockNumber"),
        "sponsored": True,
    }


@router.get("/health")
def product_health() -> Any:
    return {"status": "ok", "product": "trustverse", "features": [
        "notifications", "shares", "templates", "directory", "presentations",
        "analytics", "staff", "webhooks", "api_keys", "batch", "relay",
    ]}


def _share_json(row: ShareLink) -> dict:
    return {
        "token": row.token,
        "holder_did": row.holder_did,
        "credential_hash": row.credential_hash,
        "predicate": row.predicate,
        "predicate_params": row.predicate_params,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "revoked": row.revoked,
        "label": row.label,
        "url": f"/verify?share={row.token}",
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _template_json(t: CredentialTemplate) -> dict:
    return {
        "id": t.id,
        "issuer_did": t.issuer_did,
        "name": t.name,
        "schema_id": t.schema_id,
        "fields": t.fields_json or ["degree", "date", "cgpa"],
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _presentation_json(row: Presentation) -> dict:
    return {
        "id": row.id,
        "holder_did": row.holder_did,
        "verifier_did": row.verifier_did,
        "credential_hash": row.credential_hash,
        "request_id": row.request_id,
        "payload": row.payload,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "oid4vp": {
            "id": row.id,
            "definition_id": "trustverse-vp",
            "format": "ldp_vp",
        },
    }
