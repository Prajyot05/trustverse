import json
import base64
import os
import hashlib
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from eth_account.messages import encode_defunct
from web3.auto import w3


def holder_encryption_key(holder_did: str) -> bytes:
    """
    Demo-mode per-holder AES-256 key.

    Production would use ECIES against an encryption public key the holder
    publishes. MetaMask no longer exposes eth_getEncryptionPublicKey, so
    the localhost / thesis demo derives a deterministic 32-byte key from
    the holder DID. Both issuer (at issue time) and holder (in the wallet)
    can recompute it without exchanging a secret. This is documented as a
    demo limitation in docs/architecture.md.
    """
    return hashlib.sha256(f"trustverse-demo-key:{holder_did}".encode("utf-8")).digest()

def encrypt_credential(credential_data: Dict[str, Any], shared_key: bytes) -> Dict[str, Any]:
    """
    Encrypt a credential using AES-256-GCM.
    `shared_key` should be 32 bytes derived from the holder's public key (e.g. via ECDH).
    For simplicity in this project, we can derive it from the holder's DID/address if needed,
    but ideally it should be a proper shared secret.
    """
    aesgcm = AESGCM(shared_key)
    nonce = os.urandom(12)
    data = json.dumps(credential_data).encode('utf-8')
    ct = aesgcm.encrypt(nonce, data, None)
    
    return {
        "ciphertext": base64.b64encode(ct).decode('utf-8'),
        "nonce": base64.b64encode(nonce).decode('utf-8'),
        "alg": "AES-256-GCM"
    }

def decrypt_credential(encrypted_data: Dict[str, Any], shared_key: bytes) -> Dict[str, Any]:
    """
    Decrypt a credential using AES-256-GCM.
    """
    aesgcm = AESGCM(shared_key)
    nonce = base64.b64decode(encrypted_data["nonce"])
    ct = base64.b64decode(encrypted_data["ciphertext"])
    
    data = aesgcm.decrypt(nonce, ct, None)
    return json.loads(data.decode('utf-8'))

def sign_vc(vc_data: Dict[str, Any], private_key: str) -> Dict[str, Any]:
    """
    Sign a W3C Verifiable Credential using EcdsaSecp256k1RecoveryMethod2020.
    """
    # Create the payload to sign (excluding the proof object itself)
    payload = json.dumps(vc_data, sort_keys=True).encode('utf-8')
    
    # Hash the payload
    message_hash = encode_defunct(payload)
    
    # Sign it
    signed_message = w3.eth.account.sign_message(message_hash, private_key=private_key)
    
    vc_data["proof"] = {
        "type": "EcdsaSecp256k1RecoveryMethod2020",
        "created": vc_data.get("issuanceDate", ""),
        "verificationMethod": vc_data["issuer"] + "#controller",
        "proofPurpose": "assertionMethod",
        "proofValue": signed_message.signature.hex()
    }
    
    return vc_data
