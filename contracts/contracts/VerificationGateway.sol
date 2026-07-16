// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RevocationRegistry.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}

contract VerificationGateway {
    IGroth16Verifier public zkVerifier;
    RevocationRegistry public revocationRegistry;

    event VerificationSuccessful(bytes32 indexed credentialHash, address indexed verifier);
    event VerificationFailed(bytes32 indexed credentialHash, string reason);

    constructor(address _zkVerifier, address _revocationRegistry) {
        zkVerifier = IGroth16Verifier(_zkVerifier);
        revocationRegistry = RevocationRegistry(_revocationRegistry);
    }

    /**
     * @dev Verify a credential presentation using ZK proof and check revocation status.
     * @param credentialHash The on-chain hash of the credential being presented.
     * @param _pA ZK Proof Part A
     * @param _pB ZK Proof Part B
     * @param _pC ZK Proof Part C
     * @param _pubSignals ZK Public Signals: [poseidonCommitment, threshold]
     */
    function verifyCredential(
        bytes32 credentialHash,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external returns (bool) {
        // 1. Check if credential is revoked
        if (revocationRegistry.isRevoked(credentialHash)) {
            emit VerificationFailed(credentialHash, "Credential has been revoked");
            return false;
        }

        // 2. Verify ZK Proof for selective disclosure / threshold
        bool isValidProof = zkVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        
        if (!isValidProof) {
            emit VerificationFailed(credentialHash, "Invalid Zero-Knowledge Proof");
            return false;
        }

        emit VerificationSuccessful(credentialHash, msg.sender);
        return true;
    }
}
