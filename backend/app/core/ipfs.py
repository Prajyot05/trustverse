import os
import requests
import json
from typing import Dict, Any

PINATA_API_KEY = os.getenv("PINATA_API_KEY", "mock_key")
PINATA_API_SECRET = os.getenv("PINATA_API_SECRET", "mock_secret")
PINATA_BASE_URL = "https://api.pinata.cloud"

class IPFSStorage:
    def __init__(self, api_key: str = PINATA_API_KEY, api_secret: str = PINATA_API_SECRET):
        self.api_key = api_key
        self.api_secret = api_secret
        self.headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret
        }

    def pin_json(self, json_data: Dict[str, Any], name: str = None) -> str:
        """
        Pins a JSON object to IPFS using Pinata and returns the CID.
        In a real application, the data should be encrypted before pinning if it's sensitive.
        """
        url = f"{PINATA_BASE_URL}/pinning/pinJSONToIPFS"
        
        payload = {
            "pinataContent": json_data
        }
        
        if name:
            payload["pinataMetadata"] = {
                "name": name
            }

        # No real Pinata credentials configured: skip the network call
        # entirely (it would otherwise fail with a connection error rather
        # than a clean 401 in offline/sandboxed dev environments) and hand
        # back a deterministic local CID so the rest of the issuance flow
        # can be exercised without an internet connection or API keys.
        if self.api_key == "mock_key":
            return f"mock_cid_for_{name or 'json'}"

        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=15)
        except requests.exceptions.RequestException as exc:
            raise RuntimeError(f"Failed to reach Pinata: {exc}") from exc

        response.raise_for_status()
        return response.json().get("IpfsHash")

    def unpin(self, cid: str) -> bool:
        """Unpins a CID from Pinata"""
        url = f"{PINATA_BASE_URL}/pinning/unpin/{cid}"
        
        if self.api_key == "mock_key":
            return True
            
        response = requests.delete(url, headers=self.headers)
        return response.status_code == 200

ipfs_storage = IPFSStorage()
