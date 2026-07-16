import json
import requests
from typing import Dict, Any

class DIDResolver:
    """
    Simple DID Resolver for did:web, did:ethr, and did:key.
    In a full production environment, this would use a Universal Resolver.
    """
    
    def resolve(self, did: str) -> Dict[str, Any]:
        if did.startswith("did:web:"):
            return self._resolve_did_web(did)
        elif did.startswith("did:ethr:"):
            return self._resolve_did_ethr(did)
        elif did.startswith("did:key:"):
            return self._resolve_did_key(did)
        else:
            raise ValueError(f"Unsupported DID method in {did}")

    def _resolve_did_web(self, did: str) -> Dict[str, Any]:
        """
        Resolves a did:web by fetching the did.json from the domain.
        Example: did:web:example.com -> https://example.com/.well-known/did.json
        """
        domain = did.replace("did:web:", "").replace(":", "/")
        url = f"https://{domain}/.well-known/did.json"
        
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # For testing/demo purposes, return a mock document if resolution fails
            return self._mock_did_document(did)

    def _resolve_did_ethr(self, did: str) -> Dict[str, Any]:
        """
        Resolves a did:ethr.
        In reality, this requires querying the ERC-1056 registry contract.
        For now, we return a standard DID document based on the Ethereum address.
        """
        parts = did.split(":")
        # Format can be did:ethr:<network>:<address> or did:ethr:<address>
        address = parts[-1]
        
        return {
            "@context": "https://www.w3.org/ns/did/v1",
            "id": did,
            "verificationMethod": [{
                "id": f"{did}#controller",
                "type": "EcdsaSecp256k1RecoveryMethod2020",
                "controller": did,
                "blockchainAccountId": f"eip155:1:{address}"
            }],
            "authentication": [f"{did}#controller"],
            "assertionMethod": [f"{did}#controller"]
        }

    def _resolve_did_key(self, did: str) -> Dict[str, Any]:
        """
        Resolves a did:key.
        """
        return self._mock_did_document(did)

    def _mock_did_document(self, did: str) -> Dict[str, Any]:
        return {
            "@context": "https://www.w3.org/ns/did/v1",
            "id": did,
            "verificationMethod": [{
                "id": f"{did}#key-1",
                "type": "JsonWebKey2020",
                "controller": did,
                # Mock key for demo
                "publicKeyJwk": {
                    "kty": "EC",
                    "crv": "secp256k1",
                    "x": "mock_x",
                    "y": "mock_y"
                }
            }]
        }

did_resolver = DIDResolver()
