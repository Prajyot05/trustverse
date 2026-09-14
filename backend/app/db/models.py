from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()

class EventType(str, enum.Enum):
    CREDENTIAL_ISSUED = "CredentialIssued"
    CREDENTIAL_UPDATED = "CredentialUpdated"
    CREDENTIAL_SUSPENDED = "CredentialSuspended"
    CREDENTIAL_RENEWED = "CredentialRenewed"
    CREDENTIAL_REVOKED = "CredentialRevoked"
    CREDENTIAL_ARCHIVED = "CredentialArchived"
    PROOF_REQUESTED = "ProofRequested"
    PROOF_GENERATED = "ProofGenerated"
    VERIFICATION_COMPLETED = "VerificationCompleted"
    ISSUER_REGISTERED = "IssuerRegistered"
    ISSUER_SUSPENDED = "IssuerSuspended"

class TrustEvent(Base):
    __tablename__ = "trust_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(Enum(EventType), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    actor_did = Column(String, index=True) # Who performed the action
    target_did = Column(String, index=True) # Who the action is on (if applicable)
    credential_hash = Column(String, index=True)
    payload = Column(JSON, nullable=False) # Full event details
    
class Issuer(Base):
    __tablename__ = "issuers"
    
    did = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    eth_address = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON)
    registered_at = Column(DateTime, default=datetime.utcnow)

class CredentialRecord(Base):
    """
    Off-chain record of credentials. Ciphertext is stored locally (and
    optionally pinned). The SHA-256 of the signed VC is the on-chain
    credentialHash; poseidon_commitment is the ZK credentialRoot.
    """
    __tablename__ = "credentials"
    
    hash = Column(String, primary_key=True, index=True)
    issuer_did = Column(String, ForeignKey("issuers.did"))
    holder_did = Column(String, index=True)
    status = Column(String) # Active, Suspended, Revoked, Expired
    ipfs_cid = Column(String)
    anchored_at = Column(DateTime)
    poseidon_commitment = Column(String)
    encrypted_blob = Column(JSON)
    issuer_wallet = Column(String)
    anchor_tx_hash = Column(String)
    claims_hash = Column(String)
    salt = Column(String)
    nullifier = Column(String)
    
    issuer = relationship("Issuer")


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(Integer, primary_key=True, index=True)
    verifier_did = Column(String, index=True, nullable=False)
    holder_did = Column(String, index=True)
    issuer_did = Column(String)
    attribute = Column(String, default="cgpa")
    threshold = Column(Integer, nullable=False)  # cgpaScaled, e.g. 800 for 8.00
    status = Column(String, default="pending")  # pending, fulfilled, failed, expired
    credential_hash = Column(String)
    claim_tx_hash = Column(String)
    nonrev_tx_hash = Column(String)
    block_number = Column(Integer)
    result = Column(String)  # pass / fail
    created_at = Column(DateTime, default=datetime.utcnow)


class MerkleMeta(Base):
    """Singleton row storing the current revocation sparse-Merkle root."""
    __tablename__ = "merkle_meta"

    id = Column(Integer, primary_key=True)
    root = Column(String, nullable=False, default="0")
    depth = Column(Integer, default=20)
    occupied_leaves = Column(JSON, default=dict)  # {position_str: "1"}
