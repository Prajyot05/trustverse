from datetime import datetime, timezone
import hashlib
from typing import Dict, Any

from eth_account import Account

from app.core.crypto import encrypt_credential, sign_vc
from app.core.commitment import build_commitment
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
    issue_date_unix = int(now.timestamp())

    # 2. Derive the issuer's wallet address from their signing key, and
    #    compute the Poseidon commitment (claimsHash + credentialRoot) that
    #    ClaimProver / NonRevocation / IssuerMembership will later prove
    #    statements about. See app.core.commitment for the exact layout.
    issuer_wallet_address = Account.from_key(issuer_private_key).address
    commitment = build_commitment(
        holder_did=holder_did,
        issuer_wallet_address=issuer_wallet_address,
        schema_id=schema_id,
        credential_subject=credential_subject,
        issue_date_unix=issue_date_unix,
    )

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
        },
        # Everything a holder needs to regenerate a ClaimProver /
        # NonRevocation / IssuerMembership witness later on. Stored as
        # decimal strings (not JSON numbers) because these are up to
        # ~254-bit field elements and would silently lose precision if
        # parsed as a JS/Python float anywhere downstream.
        "trustverseCommitment": {
            "subjectId": str(commitment["subjectId"]),
            "cgpaScaled": str(commitment["cgpaScaled"]),
            "degreeCode": str(commitment["degreeCode"]),
            "issueDate": str(commitment["issueDate"]),
            "issuerPubKey": str(commitment["issuerPubKey"]),
            "salt": str(commitment["salt"]),
            "schemaId": str(commitment["schemaId"]),
            "claimsHash": str(commitment["claimsHash"]),
            "credentialRoot": str(commitment["credentialRoot"]),
        }
    }
    
    # 3. Sign the VC (binds the commitment fields into the issuer's signature)
    signed_vc = sign_vc(vc_data, issuer_private_key)
    
    # 4. Compute Hashes
    cred_hash = compute_credential_hash(signed_vc)
    poseidon_commitment = commitment["credentialRootHex"]
    
    # 5. Encrypt for Holder
    encrypted_vc = encrypt_credential(signed_vc, holder_shared_key)
    
    # 6. Store on IPFS
    ipfs_cid = ipfs_storage.pin_json(encrypted_vc, name=f"vc_{cred_hash[:8]}")
    
    # 7. Emit Trust Event
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
