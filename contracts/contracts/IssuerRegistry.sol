// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IssuerRegistry is Ownable {
    struct Issuer {
        string did;             // e.g., "did:web:iitb.ac.in"
        address walletAddress;  // The Ethereum address authorized to issue/anchor
        string metadataHash;    // IPFS hash or similar for issuer details
        uint256 registeredAt;   // Timestamp
        bool isActive;          // Active status
        
        // Reputation Context (informative only)
        uint256 credentialsIssued;
        uint256 credentialsRevoked;
        uint256 verificationCount;
    }

    // Mapping from DID string to Issuer struct
    mapping(string => Issuer) public issuersByDID;
    // Mapping from address to DID string (for reverse lookup)
    mapping(address => string) public addressToDID;

    event IssuerRegistered(string indexed did, address indexed walletAddress, uint256 timestamp);
    event IssuerSuspended(string indexed did, uint256 timestamp);
    event IssuerReactivated(string indexed did, uint256 timestamp);
    event IssuerMetricsUpdated(string indexed did, uint256 issued, uint256 revoked, uint256 verifications);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice University self-enrols: msg.sender becomes the issuing wallet for `_did`.
    /// Owner-only `registerIssuer` remains for admin/demo seeding.
    function selfRegister(string memory _did, string memory _metadataHash) external {
        _register(_did, msg.sender, _metadataHash);
    }

    function registerIssuer(string memory _did, address _walletAddress, string memory _metadataHash) external onlyOwner {
        _register(_did, _walletAddress, _metadataHash);
    }

    function _register(string memory _did, address _walletAddress, string memory _metadataHash) internal {
        require(bytes(issuersByDID[_did].did).length == 0, "Issuer already registered");
        require(bytes(addressToDID[_walletAddress]).length == 0, "Address already registered to an issuer");
        require(bytes(_did).length > 0, "DID cannot be empty");
        require(_walletAddress != address(0), "Invalid address");

        issuersByDID[_did] = Issuer({
            did: _did,
            walletAddress: _walletAddress,
            metadataHash: _metadataHash,
            registeredAt: block.timestamp,
            isActive: true,
            credentialsIssued: 0,
            credentialsRevoked: 0,
            verificationCount: 0
        });

        addressToDID[_walletAddress] = _did;

        emit IssuerRegistered(_did, _walletAddress, block.timestamp);
    }

    function suspendIssuer(string memory _did) external onlyOwner {
        require(bytes(issuersByDID[_did].did).length > 0, "Issuer not found");
        require(issuersByDID[_did].isActive, "Issuer already suspended");

        issuersByDID[_did].isActive = false;
        emit IssuerSuspended(_did, block.timestamp);
    }

    function reactivateIssuer(string memory _did) external onlyOwner {
        require(bytes(issuersByDID[_did].did).length > 0, "Issuer not found");
        require(!issuersByDID[_did].isActive, "Issuer already active");

        issuersByDID[_did].isActive = true;
        emit IssuerReactivated(_did, block.timestamp);
    }

    // Only the authorized contracts (e.g. CredentialAnchor) should call this to update metrics
    // For simplicity, anyone can call it for now, but in production, we should restrict this using AccessControl
    function recordIssuance(string memory _did) external {
        // We will restrict this in production.
        require(bytes(issuersByDID[_did].did).length > 0, "Issuer not found");
        issuersByDID[_did].credentialsIssued += 1;
        emit IssuerMetricsUpdated(_did, issuersByDID[_did].credentialsIssued, issuersByDID[_did].credentialsRevoked, issuersByDID[_did].verificationCount);
    }

    function recordRevocation(string memory _did) external {
        require(bytes(issuersByDID[_did].did).length > 0, "Issuer not found");
        issuersByDID[_did].credentialsRevoked += 1;
        emit IssuerMetricsUpdated(_did, issuersByDID[_did].credentialsIssued, issuersByDID[_did].credentialsRevoked, issuersByDID[_did].verificationCount);
    }
    
    function recordVerification(string memory _did) external {
        require(bytes(issuersByDID[_did].did).length > 0, "Issuer not found");
        issuersByDID[_did].verificationCount += 1;
        emit IssuerMetricsUpdated(_did, issuersByDID[_did].credentialsIssued, issuersByDID[_did].credentialsRevoked, issuersByDID[_did].verificationCount);
    }

    function isIssuerActive(string memory _did) external view returns (bool) {
        return issuersByDID[_did].isActive;
    }

    function getIssuerDIDByAddress(address _walletAddress) external view returns (string memory) {
        return addressToDID[_walletAddress];
    }
}
