import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from eth_account.messages import encode_defunct
from web3.auto import w3
from pydantic import BaseModel

# Secret key to encode the JWT
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

class TokenData(BaseModel):
    did: str
    wallet_address: str

def verify_siwe_message(message: str, signature: str, address: str) -> bool:
    """
    Verify EIP-4361 (Sign-In with Ethereum) message signature.
    In a full implementation, this should use the `siwe` python package 
    and verify the nonce, domain, and expiration time.
    """
    try:
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        return recovered_address.lower() == address.lower()
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        did: str = payload.get("sub")
        wallet_address: str = payload.get("wallet_address")
        if did is None or wallet_address is None:
            return None
        return TokenData(did=did, wallet_address=wallet_address)
    except JWTError:
        return None
