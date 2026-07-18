from fastapi import APIRouter, HTTPException
from typing import Any
from pydantic import BaseModel
from app.core.trust_score import TrustScoreEngine
from app.core.anchor import EthereumAnchorProvider
import os

router = APIRouter()

RPC_URL = os.getenv("ETH_RPC_URL", "http://127.0.0.1:8545")
ANCHOR_ADDRESS = os.getenv("ANCHOR_CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
REVOCATION_ADDRESS = os.getenv("REVOCATION_CONTRACT_ADDRESS", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")

class TrustScoreRequest(BaseModel):
    credential_hash: str
    ai_authenticity_score: float

@router.post("/compute")
def compute_trust_score(req: TrustScoreRequest) -> Any:
    """
    Computes the holistic Trust Score fusing on-chain verification, lineage, and AI forensics.
    """
    try:
        hash_bytes = bytes.fromhex(req.credential_hash.replace("0x", ""))
        provider = EthereumAnchorProvider(RPC_URL, ANCHOR_ADDRESS, REVOCATION_ADDRESS)
        
        # 1. On-chain validation
        anchor_data = provider.verify_anchor(hash_bytes)
        is_anchored = anchor_data.get("status") == "ANCHORED"
        is_revoked = False
        lineage_depth = 0 # Default if we don't traverse the graph
        
        if is_anchored:
            is_revoked = provider.is_revoked(hash_bytes)
            # Lineage tracking could be added here by querying the parentHash repeatedly
        
        engine = TrustScoreEngine()
        score = engine.calculate_score(
            ai_score=req.ai_authenticity_score,
            issuer_verified=is_anchored,  # Assuming if it's anchored, the issuer was verified
            is_revoked=is_revoked,
            lineage_depth=lineage_depth
        )
        
        return score
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
