"""
Thin web3 helper used by the backend for demo-mode chain writes
(publish revocation Merkle root, seed issuer) and for live reads.
Issuer/holder user transactions (anchor, prove) are signed in MetaMask.
"""
import os
from typing import Any, Dict, Optional

from web3 import Web3

RPC_URL = os.getenv("ETH_RPC_URL", "http://127.0.0.1:8545")
# Hardhat account #0 — used only for demo seed / publishing the Merkle root.
DEFAULT_DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_KEY = os.getenv("DEPLOYER_PRIVATE_KEY", DEFAULT_DEPLOYER_KEY)

GATEWAY_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "_newRoot", "type": "uint256"}],
        "name": "updateRevocationTreeRoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "revocationTreeRoot",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "verifier", "type": "address"},
            {"indexed": False, "internalType": "string", "name": "proofType", "type": "string"},
        ],
        "name": "VerificationSuccessful",
        "type": "event",
    },
]

ANCHOR_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "_credentialHash", "type": "bytes32"}],
        "name": "isAnchored",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_credentialHash", "type": "bytes32"}],
        "name": "getAnchor",
        "outputs": [
            {
                "components": [
                    {"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
                    {"internalType": "bytes32", "name": "poseidonCommitment", "type": "bytes32"},
                    {"internalType": "string", "name": "issuerDID", "type": "string"},
                    {"internalType": "uint256", "name": "anchoredAt", "type": "uint256"},
                    {"internalType": "bytes32", "name": "parentHash", "type": "bytes32"},
                ],
                "internalType": "struct CredentialAnchor.Anchor",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

REVOCATION_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "_credentialHash", "type": "bytes32"}],
        "name": "isRevoked",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]

ISSUER_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_did", "type": "string"},
            {"internalType": "address", "name": "_walletAddress", "type": "address"},
            {"internalType": "string", "name": "_metadataHash", "type": "string"},
        ],
        "name": "registerIssuer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "_did", "type": "string"}],
        "name": "isIssuerActive",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def _w3() -> Web3:
    return Web3(Web3.HTTPProvider(RPC_URL))


def _checksum(addr: str) -> str:
    return Web3.to_checksum_address(addr)


def env_address(name: str) -> Optional[str]:
    val = os.getenv(name, "")
    if not val or val.startswith("0x..."):
        return None
    return val


def publish_revocation_root(root: int) -> Dict[str, Any]:
    gateway_addr = env_address("VERIFICATION_GATEWAY_ADDRESS")
    if not gateway_addr:
        return {"status": "skipped", "reason": "VERIFICATION_GATEWAY_ADDRESS not set"}
    w3 = _w3()
    account = w3.eth.account.from_key(DEPLOYER_KEY)
    contract = w3.eth.contract(address=_checksum(gateway_addr), abi=GATEWAY_ABI)
    tx = contract.functions.updateRevocationTreeRoot(int(root)).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 200000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=DEPLOYER_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return {
        "status": "ok",
        "txHash": receipt.transactionHash.hex(),
        "blockNumber": receipt.blockNumber,
        "root": str(root),
    }


def read_anchor(credential_hash_hex: str) -> Dict[str, Any]:
    anchor_addr = env_address("ANCHOR_CONTRACT_ADDRESS")
    if not anchor_addr:
        return {"status": "NOT_CONFIGURED"}
    w3 = _w3()
    contract = w3.eth.contract(address=_checksum(anchor_addr), abi=ANCHOR_ABI)
    raw = credential_hash_hex.replace("0x", "")
    hash_bytes = bytes.fromhex(raw)
    if len(hash_bytes) != 32:
        return {"status": "ERROR", "message": "hash must be 32 bytes"}
    try:
        if not contract.functions.isAnchored(hash_bytes).call():
            return {"status": "NOT_ANCHORED"}
        data = contract.functions.getAnchor(hash_bytes).call()
        return {
            "status": "ANCHORED",
            "credentialHash": data[0].hex() if isinstance(data[0], bytes) else data[0],
            "poseidonCommitment": data[1].hex() if isinstance(data[1], bytes) else data[1],
            "issuerDID": data[2],
            "anchoredAt": data[3],
            "parentHash": data[4].hex() if isinstance(data[4], bytes) else data[4],
        }
    except Exception as exc:
        return {"status": "ERROR", "message": str(exc)}


def register_issuer_on_chain(did: str, wallet: str, metadata: str = "QmDemo") -> Dict[str, Any]:
    registry_addr = env_address("ISSUER_REGISTRY_ADDRESS")
    if not registry_addr:
        return {"status": "skipped"}
    w3 = _w3()
    account = w3.eth.account.from_key(DEPLOYER_KEY)
    contract = w3.eth.contract(address=_checksum(registry_addr), abi=ISSUER_ABI)
    tx = contract.functions.registerIssuer(did, _checksum(wallet), metadata).build_transaction(
        {"from": account.address, "nonce": w3.eth.get_transaction_count(account.address), "gas": 500000, "gasPrice": w3.eth.gas_price}
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=DEPLOYER_KEY)
    receipt = w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))
    return {"status": "ok", "txHash": receipt.transactionHash.hex()}


ANCHOR_WRITE_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "_credentialHash", "type": "bytes32"},
            {"internalType": "bytes32", "name": "_poseidonCommitment", "type": "bytes32"},
            {"internalType": "string", "name": "_issuerDID", "type": "string"},
            {"internalType": "bytes32", "name": "_parentHash", "type": "bytes32"},
        ],
        "name": "anchorCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def anchor_on_chain(credential_hash_hex: str, poseidon_hex: str, issuer_did: str) -> Dict[str, Any]:
    anchor_addr = env_address("ANCHOR_CONTRACT_ADDRESS")
    if not anchor_addr:
        return {"status": "skipped"}
    w3 = _w3()
    account = w3.eth.account.from_key(DEPLOYER_KEY)
    contract = w3.eth.contract(address=_checksum(anchor_addr), abi=ANCHOR_WRITE_ABI)
    cred = bytes.fromhex(credential_hash_hex.replace("0x", ""))
    poseidon = bytes.fromhex(poseidon_hex.replace("0x", ""))
    tx = contract.functions.anchorCredential(cred, poseidon, issuer_did, b"\x00" * 32).build_transaction(
        {"from": account.address, "nonce": w3.eth.get_transaction_count(account.address), "gas": 500000, "gasPrice": w3.eth.gas_price}
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=DEPLOYER_KEY)
    receipt = w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))
    return {"status": "ok", "txHash": receipt.transactionHash.hex(), "blockNumber": receipt.blockNumber}


def read_revoked(credential_hash_hex: str) -> bool:
    rev_addr = env_address("REVOCATION_CONTRACT_ADDRESS")
    if not rev_addr:
        return False
    w3 = _w3()
    contract = w3.eth.contract(address=_checksum(rev_addr), abi=REVOCATION_ABI)
    raw = credential_hash_hex.replace("0x", "")
    try:
        return bool(contract.functions.isRevoked(bytes.fromhex(raw)).call())
    except Exception:
        return False
