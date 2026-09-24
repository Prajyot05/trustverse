"""Predicate helpers over already-committed credential fields."""
from datetime import datetime
from typing import Any, Dict, Optional, Tuple


PREDICATE_CATALOG = [
    {
        "id": "cgpa_gte",
        "label": "CGPA at or above a threshold",
        "description": "Prove CGPA ≥ a cutoff without revealing the exact score.",
        "circuit": "ClaimProver",
        "discloses": ["Whether CGPA meets the threshold", "That the credential is not revoked"],
        "hides": ["Exact CGPA", "Degree title", "Graduation date"],
        "params": [{"key": "threshold", "label": "Minimum CGPA", "type": "number", "default": 7.0}],
    },
    {
        "id": "degree_eq",
        "label": "Holds a specific degree",
        "description": "Prove the committed degree title matches (equality).",
        "circuit": "commitment-bound",
        "discloses": ["Whether the degree title matches", "That the credential is not revoked"],
        "hides": ["CGPA", "Other degree details"],
        "params": [{"key": "degree", "label": "Degree title", "type": "string", "default": "Bachelor of Computer Engineering"}],
    },
    {
        "id": "year_range",
        "label": "Graduated in a year range",
        "description": "Prove issue year falls within a range.",
        "circuit": "commitment-bound",
        "discloses": ["Whether graduation year is in range", "That the credential is not revoked"],
        "hides": ["Exact date", "CGPA"],
        "params": [
            {"key": "from_year", "label": "From year", "type": "number", "default": 2020},
            {"key": "to_year", "label": "To year", "type": "number", "default": 2026},
        ],
    },
    {
        "id": "graduated",
        "label": "Has graduated",
        "description": "Boolean: an active, anchored credential exists.",
        "circuit": "NonRevocation",
        "discloses": ["That a valid degree credential exists and is not revoked"],
        "hides": ["CGPA", "Degree title", "Graduation date"],
        "params": [],
    },
    {
        "id": "issuer_set",
        "label": "Issued by an approved university",
        "description": "Prove the issuer DID is in a requested set (IssuerMembership).",
        "circuit": "IssuerMembership",
        "discloses": ["That the issuer is in the verifier's allow-list"],
        "hides": ["All academic attributes"],
        "params": [{"key": "issuer_dids", "label": "Allowed issuer DIDs (comma-separated)", "type": "string"}],
    },
]


def evaluate_predicate(
    predicate: str,
    params: Optional[Dict[str, Any]],
    subject: Optional[Dict[str, Any]],
    issuer_did: Optional[str],
    status: str,
) -> Tuple[bool, str]:
    params = params or {}
    subject = subject or {}
    if status and status.lower() not in ("active", "issued"):
        return False, "revoked"

    if predicate == "cgpa_gte":
        threshold = float(params.get("threshold", 0) or 0)
        cgpa = float(subject.get("cgpa") or 0)
        if cgpa >= threshold:
            return True, "pass"
        return False, "threshold_miss"

    if predicate == "degree_eq":
        wanted = str(params.get("degree") or "").strip().lower()
        got = str(subject.get("degree") or subject.get("degreeName") or "").strip().lower()
        if wanted and got == wanted:
            return True, "pass"
        return False, "degree_mismatch"

    if predicate == "year_range":
        from_year = int(params.get("from_year") or 0)
        to_year = int(params.get("to_year") or 9999)
        date = str(subject.get("date") or "")
        year = None
        if date:
            try:
                year = int(date[:4])
            except ValueError:
                year = None
        if year is None:
            year = datetime.utcnow().year
        if from_year <= year <= to_year:
            return True, "pass"
        return False, "year_out_of_range"

    if predicate == "graduated":
        return True, "pass"

    if predicate == "issuer_set":
        raw = str(params.get("issuer_dids") or "")
        allowed = [p.strip().lower() for p in raw.split(",") if p.strip()]
        if not allowed:
            return True, "pass"
        if (issuer_did or "").lower() in allowed:
            return True, "pass"
        return False, "issuer_not_in_set"

    return True, "pass"


def catalog_entry(predicate_id: str) -> Optional[Dict[str, Any]]:
    for item in PREDICATE_CATALOG:
        if item["id"] == predicate_id:
            return item
    return PREDICATE_CATALOG[0]
