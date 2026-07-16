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

        response = requests.post(url, json=payload, headers=self.headers)
        
        # If credentials are mock/invalid, return a mock CID for dev testing
        if response.status_code == 401 and self.api_key == "mock_key":
            return f"mock_cid_for_{name or 'json'}"
            
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
