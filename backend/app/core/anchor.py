from abc import ABC, abstractmethod
from typing import Dict, Any, List
from web3 import Web3

ZERO_HASH = b"\x00" * 32

class AnchorProvider(ABC):
    @abstractmethod
    def anchor_credential_hash(self, credential_hash: bytes, issuer_did: str, poseidon_commitment: bytes, parent_hash: bytes = ZERO_HASH) -> Dict[str, Any]:
        """Anchor a single credential hash on-chain"""
        pass

    @abstractmethod
    def batch_anchor_credentials(self, credential_hashes: List[bytes], poseidon_commitments: List[bytes], issuer_did: str, parent_hashes: List[bytes] = None) -> Dict[str, Any]:
        """Batch anchor multiple credential hashes on-chain"""
        pass

    @abstractmethod
    def verify_anchor(self, credential_hash: bytes) -> Dict[str, Any]:
        """Verify if a credential is anchored and get anchor details"""
        pass

    @abstractmethod
    def is_revoked(self, credential_hash: bytes) -> bool:
        """Check if a credential has been revoked"""
        pass

class EthereumAnchorProvider(AnchorProvider):
    def __init__(self, rpc_url: str, anchor_contract_address: str, revocation_contract_address: str, private_key: str = None):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.anchor_contract_address = self.w3.to_checksum_address(anchor_contract_address)
        self.revocation_contract_address = self.w3.to_checksum_address(revocation_contract_address)
        self.private_key = private_key
        if private_key:
            self.account = self.w3.eth.account.from_key(private_key)
        
        # Load ABIs - In a real app, these would be loaded from JSON artifacts
        self.anchor_abi = [
            {"inputs":[{"internalType":"bytes32","name":"_credentialHash","type":"bytes32"},{"internalType":"bytes32","name":"_poseidonCommitment","type":"bytes32"},{"internalType":"string","name":"_issuerDID","type":"string"},{"internalType":"bytes32","name":"_parentHash","type":"bytes32"}],"name":"anchorCredential","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"bytes32[]","name":"_credentialHashes","type":"bytes32[]"},{"internalType":"bytes32[]","name":"_poseidonCommitments","type":"bytes32[]"},{"internalType":"string","name":"_issuerDID","type":"string"},{"internalType":"bytes32[]","name":"_parentHashes","type":"bytes32[]"}],"name":"batchAnchorCredentials","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"bytes32","name":"_credentialHash","type":"bytes32"}],"name":"isAnchored","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"bytes32","name":"_credentialHash","type":"bytes32"}],"name":"getAnchor","outputs":[{"components":[{"internalType":"bytes32","name":"credentialHash","type":"bytes32"},{"internalType":"bytes32","name":"poseidonCommitment","type":"bytes32"},{"internalType":"string","name":"issuerDID","type":"string"},{"internalType":"uint256","name":"anchoredAt","type":"uint256"},{"internalType":"bytes32","name":"parentHash","type":"bytes32"}],"internalType":"struct CredentialAnchor.Anchor","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}
        ]
        
        self.revocation_abi = [
            {"inputs":[{"internalType":"bytes32","name":"_credentialHash","type":"bytes32"}],"name":"isRevoked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
        ]
        
        self.anchor_contract = self.w3.eth.contract(address=self.anchor_contract_address, abi=self.anchor_abi)
        self.revocation_contract = self.w3.eth.contract(address=self.revocation_contract_address, abi=self.revocation_abi)

    def _build_and_send_tx(self, func):
        if not self.private_key:
            raise Exception("Private key required for transactions")
            
        tx = func.build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 500000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "txHash": receipt.transactionHash.hex(),
            "blockNumber": receipt.blockNumber,
            "status": receipt.status
        }

    def anchor_credential_hash(self, credential_hash: bytes, issuer_did: str, poseidon_commitment: bytes, parent_hash: bytes = ZERO_HASH) -> Dict[str, Any]:
        func = self.anchor_contract.functions.anchorCredential(credential_hash, poseidon_commitment, issuer_did, parent_hash)
        return self._build_and_send_tx(func)

    def batch_anchor_credentials(self, credential_hashes: List[bytes], poseidon_commitments: List[bytes], issuer_did: str, parent_hashes: List[bytes] = None) -> Dict[str, Any]:
        parent_hashes = parent_hashes or [ZERO_HASH] * len(credential_hashes)
        func = self.anchor_contract.functions.batchAnchorCredentials(credential_hashes, poseidon_commitments, issuer_did, parent_hashes)
        return self._build_and_send_tx(func)

    def verify_anchor(self, credential_hash: bytes) -> Dict[str, Any]:
        try:
            is_anchored = self.anchor_contract.functions.isAnchored(credential_hash).call()
            if not is_anchored:
                return {"status": "NOT_ANCHORED"}
                
            anchor_data = self.anchor_contract.functions.getAnchor(credential_hash).call()
            return {
                "status": "ANCHORED",
                "credentialHash": anchor_data[0].hex(),
                "poseidonCommitment": anchor_data[1].hex(),
                "issuerDID": anchor_data[2],
                "anchoredAt": anchor_data[3],
                "parentHash": anchor_data[4].hex()
            }
        except Exception as e:
            return {"status": "ERROR", "message": str(e)}

    def is_revoked(self, credential_hash: bytes) -> bool:
        return self.revocation_contract.functions.isRevoked(credential_hash).call()
