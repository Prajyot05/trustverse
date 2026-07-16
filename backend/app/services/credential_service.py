from datetime import datetime, timezone
import hashlib
from typing import Dict, Any

from app.core.crypto import encrypt_credential, sign_vc
from app.core.ipfs import ipfs_storage
from app.core.events import event_bus, TrustEventPayload

def compute_credential_hash(vc_data: Dict[str, Any]) -> str:
    """
    Computes a SHA-256 hash of the Verifiable Credential data (excluding the proof).
    """
    # Exclude proof to ensure hash matches before and after signing, 
    # or just hash the whole thing. Typically we hash the signed VC to anchor it.
    import json
    canonical_data = json.dumps(vc_data, sort_keys=True).encode('utf-8')
    return hashlib.sha256(canonical_data).hexdigest()

def compute_poseidon_commitment(attributes: Dict[str, Any], nonce: int) -> str:
    """
    Computes a Poseidon commitment of the credential attributes.
    In a real implementation, this would call the circomlibjs poseidon hash function,
    either via a tiny node service or a python implementation of poseidon.
    For this boilerplate, we'll return a dummy commitment.
    """
    # TODO: Implement actual Poseidon hash
    return "0x" + hashlib.sha256(str(attributes).encode('utf-8')).hexdigest()

def issue_credential(
    issuer_did: str, 
    issuer_private_key: str, 
    holder_did: str, 
    holder_shared_key: bytes, 
    credential_subject: Dict[str, Any],
    schema_id: str
) -> Dict[str, Any]:
    
    # 1. Construct the W3C VC
    now = datetime.now(timezone.utc)
    
    vc_data = {
        "@context": [
            "https://www.w3.org/ns/credentials/v2",
            "https://trustverse.app/ns/credentials/v1"
        ],
        "type": ["VerifiableCredential", "TrustVerseCredential"],
        "issuer": issuer_did,
        "issuanceDate": now.isoformat(),
        "credentialSubject": {
            "id": holder_did,
            **credential_subject
        },
        "credentialSchema": {
            "id": schema_id,
            "type": "JsonSchema"
        }
    }
    
    # 2. Sign the VC
    signed_vc = sign_vc(vc_data, issuer_private_key)
    
    # 3. Compute Hashes
    cred_hash = compute_credential_hash(signed_vc)
    poseidon_commitment = compute_poseidon_commitment(credential_subject, nonce=1234)
    
    # 4. Encrypt for Holder
    encrypted_vc = encrypt_credential(signed_vc, holder_shared_key)
    
    # 5. Store on IPFS
    ipfs_cid = ipfs_storage.pin_json(encrypted_vc, name=f"vc_{cred_hash[:8]}")
    
    # 6. Emit Trust Event
    event = TrustEventPayload(
        event_type="CredentialIssued",
        actor_did=issuer_did,
        target_did=holder_did,
        credential_hash=cred_hash,
        payload={
            "schemaId": schema_id,
            "ipfsCid": ipfs_cid,
            "poseidonCommitment": poseidon_commitment
        }
    )
    event_bus.publish(event)
    
    # (Note: Anchor generation happens separately or triggered by the event bus consumer)
    
    return {
        "status": "issued",
        "credentialHash": cred_hash,
        "poseidonCommitment": poseidon_commitment,
        "ipfsCid": ipfs_cid,
        "signedVc": signed_vc
    }
