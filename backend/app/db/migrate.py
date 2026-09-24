"""Lightweight SQLite column adds so existing demo DBs pick up new fields."""
from sqlalchemy import inspect, text


COLUMN_SPECS = {
    "issuers": [
        ("domain", "VARCHAR"),
        ("verified", "BOOLEAN"),
        ("accreditation", "VARCHAR"),
    ],
    "credentials": [
        ("holder_email", "VARCHAR"),
        ("claim_token", "VARCHAR"),
        ("claimed_at", "DATETIME"),
        ("template_id", "VARCHAR"),
        ("enc_scheme", "VARCHAR"),
        ("holder_pubkey", "VARCHAR"),
    ],
    "verification_requests": [
        ("holder_email", "VARCHAR"),
        ("holder_name", "VARCHAR"),
        ("expires_at", "DATETIME"),
        ("predicate", "VARCHAR"),
        ("predicate_params", "JSON"),
        ("invite_token", "VARCHAR"),
        ("fail_reason", "VARCHAR"),
        ("template_label", "VARCHAR"),
    ],
}


def ensure_columns(engine) -> None:
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table, cols in COLUMN_SPECS.items():
            if table not in tables:
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for name, typ in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {typ}"))
