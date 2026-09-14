"""
Credential commitment derivation for TrustVerse.

This module turns a (mostly free-form) `credential_subject` dict into the
concrete numeric claim fields that ClaimProver.circom, NonRevocation.circom
and IssuerMembership.circom operate over, and computes the resulting
claimsHash / credentialRoot using the shared Poseidon commitment layout
(see backend/app/core/poseidon.py and circuits/ClaimProver.circom):

    claimsHash     = Poseidon(subjectId, cgpaScaled, degreeCode, issueDate)
    credentialRoot = Poseidon(claimsHash, issuerPubKey, salt, schemaId)

Documented simplification (see docs/architecture.md, Limitations): issuerPubKey
is derived from the issuer's Ethereum address rather than a dedicated
in-circuit public key on an embedded curve such as Baby Jubjub. That keeps
the circuits and issuance flow tractable for a student project; binding
credentialRoot to a real in-circuit issuer signature is future work.
"""
import hashlib
import secrets
from typing import Any, Dict, Optional

from app.core.poseidon import compute_claims_hash, compute_credential_root, field_to_hex

# BN128 (a.k.a. BN254) scalar field prime - the field circom/snarkjs operate
# over by default, and therefore the field every value below must live in.
FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617


def field_from_string(value: str) -> int:
    """Deterministically map an arbitrary string to a BN128 field element."""
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return int.from_bytes(digest, "big") % FIELD_PRIME


def field_from_address(address: str) -> int:
    """An Ethereum address (20 bytes) always fits in the field without reduction."""
    return int(address, 16) if address.lower().startswith("0x") else field_from_string(address)


def encode_cgpa(cgpa: Any) -> int:
    """cgpaScaled = round(cgpa * 100); an integer claim field for GreaterEqThan(64)."""
    return int(round(float(cgpa) * 100))


def generate_salt() -> int:
    """A fresh, uniformly random field element, unique per credential."""
    return secrets.randbelow(FIELD_PRIME)


def build_commitment(
    holder_did: str,
    issuer_wallet_address: str,
    schema_id: str,
    credential_subject: Dict[str, Any],
    issue_date_unix: int,
    salt: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Derive claim fields + claimsHash + credentialRoot for a credential.

    Returns a dict containing every field the holder needs later to
    reconstruct a ClaimProver / NonRevocation / IssuerMembership witness
    (subjectId, cgpaScaled, degreeCode, issueDate, issuerPubKey, salt,
    schemaId, claimsHash, credentialRoot, credentialRootHex).
    """
    if "cgpa" not in credential_subject:
        raise ValueError("credential_subject must include a numeric 'cgpa' field")

    degree_name = credential_subject.get("degreeName") or credential_subject.get("degree") or ""

    subject_id = field_from_string(holder_did)
    cgpa_scaled = encode_cgpa(credential_subject["cgpa"])
    degree_code = field_from_string(str(degree_name))
    issuer_pub_key = field_from_address(issuer_wallet_address)
    schema_id_field = field_from_string(schema_id)
    resolved_salt = generate_salt() if salt is None else salt

    claims_hash = compute_claims_hash(subject_id, cgpa_scaled, degree_code, issue_date_unix)
    credential_root = compute_credential_root(claims_hash, issuer_pub_key, resolved_salt, schema_id_field)

    return {
        "subjectId": subject_id,
        "cgpaScaled": cgpa_scaled,
        "degreeCode": degree_code,
        "issueDate": issue_date_unix,
        "issuerPubKey": issuer_pub_key,
        "salt": resolved_salt,
        "schemaId": schema_id_field,
        "claimsHash": claims_hash,
        "credentialRoot": credential_root,
        "credentialRootHex": field_to_hex(credential_root),
    }
