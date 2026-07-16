// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IssuerRegistry.sol";
import "./CredentialAnchor.sol";

contract RevocationRegistry {
    IssuerRegistry public registry;
    CredentialAnchor public anchor;

    // Reason Codes
    // 0 = EXPIRED
    // 1 = ADMINISTRATIVE
    // 2 = ACADEMIC_MISCONDUCT
    // 3 = DUPLICATE_ISSUANCE
    // 4 = SUPERSEDED
    // 5 = FRAUD
    // 6 = VOLUNTARY_WITHDRAWAL
    
    struct RevocationRecord {
        uint8 reasonCode;
        string details;
        uint256 timestamp;
        bool isRevoked;
    }

    // Mapping from credentialHash to RevocationRecord
    mapping(bytes32 => RevocationRecord) public revocations;

    // Multi-sig state per issuer DID
    // Maps issuerDID to an array of authorized signers
    mapping(string => address[]) public issuerSigners;
    
    // Revocation proposals: hash -> mapping of address to approval status
    mapping(bytes32 => mapping(address => bool)) public revocationApprovals;
    mapping(bytes32 => uint8) public revocationApprovalCounts;
    mapping(bytes32 => bool) public revocationExecuted;

    event RevocationProposed(bytes32 indexed credentialHash, string issuerDID, address proposer);
    event RevocationApproved(bytes32 indexed credentialHash, string issuerDID, address approver);
    event CredentialRevoked(bytes32 indexed credentialHash, uint8 reasonCode, string details, uint256 timestamp);

    constructor(address _registryAddress, address _anchorAddress) {
        require(_registryAddress != address(0), "Invalid registry");
        require(_anchorAddress != address(0), "Invalid anchor");
        registry = IssuerRegistry(_registryAddress);
        anchor = CredentialAnchor(_anchorAddress);
    }

    // Assign signers for an issuer (Only the main registered wallet can do this initially)
    function setIssuerSigners(string memory _issuerDID, address[] calldata _signers) external {
        string memory actualDID = registry.getIssuerDIDByAddress(msg.sender);
        require(keccak256(abi.encodePacked(actualDID)) == keccak256(abi.encodePacked(_issuerDID)), "Caller is not the main issuer wallet");
        
        // Let's say we require exactly 3 signers for a 2-of-3 multisig
        require(_signers.length == 3, "Requires exactly 3 signers");
        
        issuerSigners[_issuerDID] = _signers;
    }

    function isSigner(string memory _issuerDID, address _account) public view returns (bool) {
        address[] memory signers = issuerSigners[_issuerDID];
        for (uint i = 0; i < signers.length; i++) {
            if (signers[i] == _account) {
                return true;
            }
        }
        return false;
    }

    // Step 1: Propose Revocation
    function proposeRevocation(bytes32 _credentialHash, string memory _issuerDID) external {
        require(registry.isIssuerActive(_issuerDID), "Issuer not active");
        require(anchor.isAnchored(_credentialHash), "Credential not anchored");
        require(isSigner(_issuerDID, msg.sender), "Caller is not a signer for this issuer");
        require(!revocations[_credentialHash].isRevoked, "Already revoked");
        require(!revocationExecuted[_credentialHash], "Revocation already executed");

        if (!revocationApprovals[_credentialHash][msg.sender]) {
            revocationApprovals[_credentialHash][msg.sender] = true;
            revocationApprovalCounts[_credentialHash] += 1;
            emit RevocationProposed(_credentialHash, _issuerDID, msg.sender);
        }
    }

    // Step 2: Approve and Execute if threshold (2) met
    function approveRevocation(bytes32 _credentialHash, string memory _issuerDID, uint8 _reasonCode, string memory _details) external {
        require(registry.isIssuerActive(_issuerDID), "Issuer not active");
        require(isSigner(_issuerDID, msg.sender), "Caller is not a signer for this issuer");
        require(!revocations[_credentialHash].isRevoked, "Already revoked");
        require(!revocationExecuted[_credentialHash], "Revocation already executed");
        require(!revocationApprovals[_credentialHash][msg.sender], "Already approved by caller");

        revocationApprovals[_credentialHash][msg.sender] = true;
        revocationApprovalCounts[_credentialHash] += 1;
        emit RevocationApproved(_credentialHash, _issuerDID, msg.sender);

        if (revocationApprovalCounts[_credentialHash] >= 2) {
            // Execute revocation
            revocationExecuted[_credentialHash] = true;
            revocations[_credentialHash] = RevocationRecord({
                reasonCode: _reasonCode,
                details: _details,
                timestamp: block.timestamp,
                isRevoked: true
            });

            registry.recordRevocation(_issuerDID);

            emit CredentialRevoked(_credentialHash, _reasonCode, _details, block.timestamp);
        }
    }

    function isRevoked(bytes32 _credentialHash) external view returns (bool) {
        return revocations[_credentialHash].isRevoked;
    }

    function getRevocationDetails(bytes32 _credentialHash) external view returns (RevocationRecord memory) {
        require(revocations[_credentialHash].isRevoked, "Credential not revoked");
        return revocations[_credentialHash];
    }
}
