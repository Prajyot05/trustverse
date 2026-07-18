from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict
from pydantic import BaseModel

from app.core.anchor import EthereumAnchorProvider
import os

router = APIRouter()

# In a real app, these would come from config/env
RPC_URL = os.getenv("ETH_RPC_URL", "http://127.0.0.1:8545")
ANCHOR_ADDRESS = os.getenv("ANCHOR_CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
REVOCATION_ADDRESS = os.getenv("REVOCATION_CONTRACT_ADDRESS", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")

def get_anchor_provider():
    return EthereumAnchorProvider(RPC_URL, ANCHOR_ADDRESS, REVOCATION_ADDRESS)

class ProofSubmitRequest(BaseModel):
    credential_hash: str
    proof: Dict[str, Any]
    public_signals: list

@router.get("/{credential_hash}")
def verify_credential_public(credential_hash: str) -> Any:
    """
    Public endpoint to verify a credential hash against the blockchain.
    """
    try:
        # Convert hex string to bytes if needed
        hash_bytes = bytes.fromhex(credential_hash.replace("0x", ""))
        if len(hash_bytes) != 32:
            raise ValueError("Invalid hash length")
            
        provider = get_anchor_provider()
        
        # 1. Check if anchored
        anchor_data = provider.verify_anchor(hash_bytes)
        if anchor_data.get("status") != "ANCHORED":
            return {"is_valid": False, "reason": "Not anchored on blockchain", "data": None}
            
        # 2. Check if revoked
        is_revoked = provider.is_revoked(hash_bytes)
        if is_revoked:
            return {"is_valid": False, "reason": "Credential has been revoked by issuer", "data": anchor_data}
            
        return {
            "is_valid": True,
            "reason": "Valid and active",
            "data": anchor_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/proof")
def submit_zk_proof(req: ProofSubmitRequest) -> Any:
    """
    Submit a ZK proof for verification.
    In a real system, this would call VerificationGateway.sol on-chain,
    or verify the proof off-chain using snarkjs if gas costs are a concern.
    """
    # For now, we return success as long as it's structurally okay
    if not req.proof or not req.public_signals:
        raise HTTPException(status_code=400, detail="Invalid proof format")
        
    # Example off-chain check or sending tx to VerificationGateway
    # returning a mock success for UI integration
    return {
        "status": "success",
        "verified": True,
        "tx_hash": "0xmocktxhash"
    }
