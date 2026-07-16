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
    Off-chain record of credentials. Actual credential content is in IPFS.
    This tracks the state of credentials issued or requested through TrustVerse.
    """
    __tablename__ = "credentials"
    
    hash = Column(String, primary_key=True, index=True)
    issuer_did = Column(String, ForeignKey("issuers.did"))
    holder_did = Column(String, index=True)
    status = Column(String) # Active, Suspended, Revoked, Expired
    ipfs_cid = Column(String)
    anchored_at = Column(DateTime)
    
    issuer = relationship("Issuer")
