from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, Optional

from eth_account import Account

from app.core.crypto import encrypt_credential, sign_vc, holder_encryption_key
from app.core.commitment import build_commitment
from app.core.ipfs import ipfs_storage
from app.core.events import event_bus, TrustEventPayload
from app.core.poseidon import poseidon_hash, field_to_hex


def compute_credential_hash(vc_data: Dict[str, Any]) -> str:
    import json
    canonical_data = json.dumps(vc_data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(canonical_data).hexdigest()


def issue_credential(
    issuer_did: str,
    holder_did: str,
    credential_subject: Dict[str, Any],
    schema_id: str,
    issuer_wallet_address: str,
    issuer_private_key: Optional[str] = None,
    holder_shared_key: Optional[bytes] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    issue_date_unix = int(now.timestamp())

    if issuer_private_key:
        issuer_wallet_address = Account.from_key(issuer_private_key).address

    if holder_shared_key is None:
        holder_shared_key = holder_encryption_key(holder_did)

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
            "https://trustverse.app/ns/credentials/v1",
        ],
        "type": ["VerifiableCredential", "TrustVerseCredential"],
        "issuer": issuer_did,
        "issuanceDate": now.isoformat(),
        "credentialSubject": {
            "id": holder_did,
            **credential_subject,
        },
        "credentialSchema": {
            "id": schema_id,
            "type": "JsonSchema",
        },
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
        },
    }

    if issuer_private_key:
        signed_vc = sign_vc(vc_data, issuer_private_key)
    else:
        vc_data["proof"] = {
            "type": "EcdsaSecp256k1RecoveryMethod2020",
            "created": now.isoformat(),
            "verificationMethod": issuer_did + "#controller",
            "proofPurpose": "assertionMethod",
            "proofValue": "pending-on-chain-anchor",
        }
        signed_vc = vc_data

    cred_hash = compute_credential_hash(signed_vc)
    poseidon_commitment = commitment["credentialRootHex"]
    encrypted_vc = encrypt_credential(signed_vc, holder_shared_key)
    ipfs_cid = ipfs_storage.pin_json(encrypted_vc, name=f"vc_{cred_hash[:8]}")

    nullifier = poseidon_hash([commitment["claimsHash"], commitment["salt"]])

    event_bus.publish(
        TrustEventPayload(
            event_type="CredentialIssued",
            actor_did=issuer_did,
            target_did=holder_did,
            credential_hash=cred_hash,
            payload={
                "schemaId": schema_id,
                "ipfsCid": ipfs_cid,
                "poseidonCommitment": poseidon_commitment,
            },
        )
    )

    return {
        "status": "issued",
        "credentialHash": cred_hash,
        "poseidonCommitment": poseidon_commitment,
        "ipfsCid": ipfs_cid,
        "signedVc": signed_vc,
        "encrypted": encrypted_vc,
        "claimsHash": str(commitment["claimsHash"]),
        "salt": str(commitment["salt"]),
        "nullifier": str(nullifier),
        "nullifierHex": field_to_hex(nullifier),
        "issuerWallet": issuer_wallet_address,
    }
