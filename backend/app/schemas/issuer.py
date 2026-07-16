from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class IssuerRegistrationRequest(BaseModel):
    did: str
    wallet_address: str
    name: str
    metadata_json: Dict[str, Any]

class IssuerResponse(BaseModel):
    did: str
    name: str
    wallet_address: str
    is_active: bool
    registered_at: datetime
    metrics: Dict[str, int]
