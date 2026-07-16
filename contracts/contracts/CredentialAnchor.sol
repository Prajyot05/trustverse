// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IssuerRegistry.sol";

contract CredentialAnchor {
    IssuerRegistry public registry;

    struct Anchor {
        bytes32 credentialHash;       // SHA-256 of the VC
        bytes32 poseidonCommitment;   // ZK Commitment
        string issuerDID;             // e.g., "did:web:iitb.ac.in"
        uint256 anchoredAt;           // Timestamp
        bytes32 parentHash;           // Trust Graph Lineage (0 if root)
    }

    // Maps credentialHash to Anchor struct
    mapping(bytes32 => Anchor) public anchors;

    // Maps Merkle Root to boolean (for batch anchoring)
    mapping(bytes32 => bool) public anchoredBatches;

    event CredentialAnchored(bytes32 indexed credentialHash, string issuerDID, uint256 timestamp, bytes32 indexed parentHash);
    event BatchCredentialsAnchored(string issuerDID, uint256 count, uint256 timestamp);
    event MerkleBatchAnchored(bytes32 indexed merkleRoot, string issuerDID, uint256 timestamp);

    constructor(address _registryAddress) {
        require(_registryAddress != address(0), "Invalid registry address");
        registry = IssuerRegistry(_registryAddress);
    }

    modifier onlyActiveIssuer(string memory _issuerDID) {
        // Ensure caller is the registered wallet address for this DID
        string memory actualDID = registry.getIssuerDIDByAddress(msg.sender);
        require(keccak256(abi.encodePacked(actualDID)) == keccak256(abi.encodePacked(_issuerDID)), "Caller is not authorized for this DID");
        
        // Ensure issuer is active
        require(registry.isIssuerActive(_issuerDID), "Issuer is not active");
        _;
    }

    function anchorCredential(bytes32 _credentialHash, bytes32 _poseidonCommitment, string memory _issuerDID, bytes32 _parentHash) public onlyActiveIssuer(_issuerDID) {
        require(anchors[_credentialHash].anchoredAt == 0, "Credential already anchored");

        anchors[_credentialHash] = Anchor({
            credentialHash: _credentialHash,
            poseidonCommitment: _poseidonCommitment,
            issuerDID: _issuerDID,
            anchoredAt: block.timestamp,
            parentHash: _parentHash
        });

        registry.recordIssuance(_issuerDID);

        emit CredentialAnchored(_credentialHash, _issuerDID, block.timestamp, _parentHash);
    }

    // Legacy batch logic (iterative)
    function batchAnchorCredentials(bytes32[] calldata _credentialHashes, bytes32[] calldata _poseidonCommitments, string memory _issuerDID, bytes32[] calldata _parentHashes) external onlyActiveIssuer(_issuerDID) {
        require(_credentialHashes.length == _poseidonCommitments.length, "Array lengths must match");
        require(_credentialHashes.length == _parentHashes.length, "Array lengths must match");
        require(_credentialHashes.length > 0, "Arrays cannot be empty");

        for (uint256 i = 0; i < _credentialHashes.length; i++) {
            anchorCredential(_credentialHashes[i], _poseidonCommitments[i], _issuerDID, _parentHashes[i]);
        }

        emit BatchCredentialsAnchored(_issuerDID, _credentialHashes.length, block.timestamp);
    }

    // New Merkle Batch logic (O(1) storage)
    function anchorMerkleBatch(bytes32 _merkleRoot, string memory _issuerDID) external onlyActiveIssuer(_issuerDID) {
        require(!anchoredBatches[_merkleRoot], "Batch root already anchored");
        anchoredBatches[_merkleRoot] = true;
        emit MerkleBatchAnchored(_merkleRoot, _issuerDID, block.timestamp);
    }

    // Verify inclusion in a Merkle batch
    function verifyBatchCredential(bytes32 _credentialHash, bytes32[] calldata _proof, bytes32 _merkleRoot) external view returns (bool) {
        require(anchoredBatches[_merkleRoot], "Batch root not anchored");
        
        bytes32 computedHash = _credentialHash;
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == _merkleRoot;
    }

    function isAnchored(bytes32 _credentialHash) external view returns (bool) {
        return anchors[_credentialHash].anchoredAt > 0;
    }

    function getAnchor(bytes32 _credentialHash) external view returns (Anchor memory) {
        require(anchors[_credentialHash].anchoredAt > 0, "Credential not anchored");
        return anchors[_credentialHash];
    }
}
