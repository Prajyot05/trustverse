// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RevocationRegistry.sol";
import "./CredentialAnchor.sol";

/*
 * All three TrustVerse circuits (ClaimProver, NonRevocation, IssuerMembership)
 * declare exactly 2 public inputs plus 1 public output (`isValid`), so
 * snarkjs always emits a 3-element public signals array for every one of
 * them, ordered [isValid, <public input 0>, <public input 1>] (circom lists
 * `component main`'s outputs before its declared `public [...]` inputs).
 *
 *   ClaimProver:      [isValid, credentialRoot, threshold]
 *   NonRevocation:    [isValid, credentialRoot, revocationTreeRoot]
 *   IssuerMembership: [isValid, credentialRoot, issuerRegistryRoot]
 */
interface IClaimProverVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external view returns (bool);
}

interface INonRevocationVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title VerificationGateway
 * @dev Routes ZK proof presentations to the correct Groth16 verifier and
 * checks credential revocation status. This is the only on-chain contract
 * a verifier (employer/admissions office) needs to call to check a
 * holder's selective-disclosure proof.
 */
contract VerificationGateway {
    IClaimProverVerifier public claimVerifier;
    INonRevocationVerifier public nonRevocationVerifier;
    RevocationRegistry public revocationRegistry;
    CredentialAnchor public credentialAnchor;

    // The current root of the backend-maintained sparse Merkle
    // non-revocation tree (see M4 / docs/architecture.md). NonRevocation
    // proofs are only accepted against this root, so a holder cannot reuse
    // a proof generated against a stale (pre-revocation) tree.
    uint256 public revocationTreeRoot;
    address public revocationRootPublisher;

    event VerificationSuccessful(bytes32 indexed credentialHash, address indexed verifier, string proofType);
    event VerificationFailed(bytes32 indexed credentialHash, string reason);
    event RevocationTreeRootUpdated(uint256 newRoot);

    constructor(
        address _claimVerifier,
        address _nonRevocationVerifier,
        address _revocationRegistry,
        address _credentialAnchor
    ) {
        require(_claimVerifier != address(0), "Invalid claim verifier");
        require(_nonRevocationVerifier != address(0), "Invalid non-revocation verifier");
        require(_revocationRegistry != address(0), "Invalid revocation registry");
        require(_credentialAnchor != address(0), "Invalid credential anchor");

        claimVerifier = IClaimProverVerifier(_claimVerifier);
        nonRevocationVerifier = INonRevocationVerifier(_nonRevocationVerifier);
        revocationRegistry = RevocationRegistry(_revocationRegistry);
        credentialAnchor = CredentialAnchor(_credentialAnchor);
        revocationRootPublisher = msg.sender;
    }

    /**
     * @dev Every proof's public credentialRoot (pubSignals[1], see the
     * interfaces above) must match the poseidonCommitment anchored
     * on-chain for the claimed credentialHash - otherwise a holder could
     * present a valid-looking ZK proof about a *different* credential
     * than the one they claim to be presenting.
     */
    function _requireMatchesAnchor(bytes32 credentialHash, uint256 provenCredentialRoot) internal view returns (bool) {
        CredentialAnchor.Anchor memory anchorData = credentialAnchor.getAnchor(credentialHash);
        return anchorData.poseidonCommitment == bytes32(provenCredentialRoot);
    }

    modifier onlyRootPublisher() {
        require(msg.sender == revocationRootPublisher, "Not authorized to publish revocation root");
        _;
    }

    /**
     * @dev Called by the backend indexer whenever RevocationRegistry's
     * revocation state changes and the sparse Merkle tree it maintains
     * gets a new root (see M4). Kept separate from RevocationRegistry
     * itself so the gateway's trust model for "what root is current" is
     * explicit and auditable via the RevocationTreeRootUpdated event.
     */
    function updateRevocationTreeRoot(uint256 _newRoot) external onlyRootPublisher {
        revocationTreeRoot = _newRoot;
        emit RevocationTreeRootUpdated(_newRoot);
    }

    function transferRootPublisher(address _newPublisher) external onlyRootPublisher {
        require(_newPublisher != address(0), "Invalid publisher");
        revocationRootPublisher = _newPublisher;
    }

    /**
     * @dev Verify a "claim >= threshold" selective-disclosure proof
     * (ClaimProver.circom). Public signals: [isValid, credentialRoot, threshold].
     * Also rejects credentials that RevocationRegistry has directly marked
     * as revoked (the simple, non-anonymous boolean check); the stronger,
     * privacy-preserving check is verifyNonRevocationProof below.
     */
    function verifyClaimProof(
        bytes32 credentialHash,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external returns (bool) {
        if (!credentialAnchor.isAnchored(credentialHash)) {
            emit VerificationFailed(credentialHash, "Credential is not anchored");
            return false;
        }

        if (revocationRegistry.isRevoked(credentialHash)) {
            emit VerificationFailed(credentialHash, "Credential has been revoked");
            return false;
        }

        if (!_requireMatchesAnchor(credentialHash, _pubSignals[1])) {
            emit VerificationFailed(credentialHash, "Proof does not match anchored credential");
            return false;
        }

        bool isValidProof = claimVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!isValidProof) {
            emit VerificationFailed(credentialHash, "Invalid claim proof");
            return false;
        }

        emit VerificationSuccessful(credentialHash, msg.sender, "ClaimProver");
        return true;
    }

    /**
     * @dev Verify a privacy-preserving Merkle non-membership proof
     * (NonRevocation.circom) against the currently published revocation
     * tree root. Public signals: [isValid, credentialRoot, revocationTreeRoot].
     */
    function verifyNonRevocationProof(
        bytes32 credentialHash,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external returns (bool) {
        if (!credentialAnchor.isAnchored(credentialHash)) {
            emit VerificationFailed(credentialHash, "Credential is not anchored");
            return false;
        }

        if (!_requireMatchesAnchor(credentialHash, _pubSignals[1])) {
            emit VerificationFailed(credentialHash, "Proof does not match anchored credential");
            return false;
        }

        if (_pubSignals[2] != revocationTreeRoot) {
            emit VerificationFailed(credentialHash, "Stale or invalid revocation tree root");
            return false;
        }

        bool isValidProof = nonRevocationVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!isValidProof) {
            emit VerificationFailed(credentialHash, "Invalid non-revocation proof");
            return false;
        }

        emit VerificationSuccessful(credentialHash, msg.sender, "NonRevocation");
        return true;
    }
}
