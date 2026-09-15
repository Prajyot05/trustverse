"""Demo-mode seeder: one university, two students, one revoked credential, one pending request."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Issuer, CredentialRecord, VerificationRequest
from app.services.credential_service import issue_credential
from app.core.revocation_tree import mark_revoked, current_root
from app.core.chain import register_issuer_on_chain, anchor_on_chain

router = APIRouter()

UNIVERSITY_DID = "did:ethr:trustverse-university"
HOLDER_ALICE = "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # hardhat #1
HOLDER_BOB = "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  # hardhat #2
VERIFIER_DID = "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906"  # hardhat #3


@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    issuer = db.query(Issuer).filter(Issuer.did == UNIVERSITY_DID).first()
    if issuer is None:
        issuer = Issuer(
            did=UNIVERSITY_DID,
            name="TrustVerse University",
            eth_address="0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
            metadata_json={"demo": True},
            is_active=True,
            domain="trustverse.university",
            verified=True,
            accreditation="NAAC A++",
        )
        db.add(issuer)
        db.commit()
    else:
        issuer.verified = True
        issuer.domain = issuer.domain or "trustverse.university"
        issuer.accreditation = issuer.accreditation or "NAAC A++"
        db.commit()

    try:
        register_issuer_on_chain(UNIVERSITY_DID, issuer.eth_address, "QmTrustVerseDemo")
    except Exception as exc:
        print(f"On-chain issuer registration skipped/failed: {exc}")

    existing = db.query(CredentialRecord).filter(CredentialRecord.issuer_did == UNIVERSITY_DID).count()
    if existing >= 2:
        pending = db.query(VerificationRequest).filter(VerificationRequest.status == "pending").first()
        return {
            "status": "already_seeded",
            "university_did": UNIVERSITY_DID,
            "alice_did": HOLDER_ALICE,
            "bob_did": HOLDER_BOB,
            "pending_request_id": pending.id if pending else None,
            "revocation_root": current_root(),
        }

    alice = issue_credential(
        issuer_did=UNIVERSITY_DID,
        holder_did=HOLDER_ALICE,
        credential_subject={"degree": "Bachelor of Computer Engineering", "cgpa": 8.9, "date": "2026-05-15"},
        schema_id="degree-v1",
        issuer_wallet_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    )
    bob = issue_credential(
        issuer_did=UNIVERSITY_DID,
        holder_did=HOLDER_BOB,
        credential_subject={"degree": "Bachelor of Computer Engineering", "cgpa": 6.4, "date": "2026-05-15"},
        schema_id="degree-v1",
        issuer_wallet_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    )

    for result, holder, status in (
        (alice, HOLDER_ALICE, "Active"),
        (bob, HOLDER_BOB, "Revoked"),
    ):
        rec = CredentialRecord(
            hash=result["credentialHash"],
            issuer_did=UNIVERSITY_DID,
            holder_did=holder,
            status=status,
            ipfs_cid=result["ipfsCid"],
            poseidon_commitment=result["poseidonCommitment"],
            encrypted_blob=result["encrypted"],
            issuer_wallet=result["issuerWallet"],
            claims_hash=result["claimsHash"],
            salt=result["salt"],
            nullifier=result["nullifier"],
            anchored_at=datetime.utcnow(),
        )
        db.add(rec)

    db.commit()

    for result in (alice, bob):
        try:
            anchor_on_chain(result["credentialHash"], result["poseidonCommitment"], UNIVERSITY_DID)
        except Exception as exc:
            print(f"Anchor skipped: {exc}")

    mark_revoked(int(bob["nullifier"]))

    req = VerificationRequest(
        verifier_did=VERIFIER_DID,
        holder_did=HOLDER_ALICE,
        issuer_did=UNIVERSITY_DID,
        attribute="cgpa",
        threshold=800,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "status": "seeded",
        "university_did": UNIVERSITY_DID,
        "alice_did": HOLDER_ALICE,
        "alice_hash": alice["credentialHash"],
        "bob_did": HOLDER_BOB,
        "bob_hash": bob["credentialHash"],
        "pending_request_id": req.id,
        "revocation_root": current_root(),
        "note": "Alice CGPA 8.9 (active). Bob CGPA 6.4 (revoked). Pending request: CGPA >= 8.0 for Alice.",
    }
