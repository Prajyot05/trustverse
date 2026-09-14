pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * ClaimProver Circuit
 *
 * TrustVerse shared commitment layout (used by every circuit in this
 * directory, and mirrored bit-for-bit by backend/app/core/poseidon.py):
 *
 *   claimsHash     = Poseidon(subjectId, cgpaScaled, degreeCode, issueDate)
 *   credentialRoot = Poseidon(claimsHash, issuerPubKey, salt, schemaId)
 *
 * ClaimProver proves, without revealing subjectId, cgpaScaled, degreeCode,
 * issueDate, issuerPubKey, salt or schemaId:
 *   1. The private claim fields are consistent with the on-chain
 *      credentialRoot anchored for this credential.
 *   2. cgpaScaled >= threshold (the only claim value ever disclosed is the
 *      public threshold chosen by the verifier, e.g. "CGPA >= 8.0").
 */
template ClaimProver(nBits) {
    // Public Inputs
    signal input credentialRoot;
    signal input threshold;

    // Private Inputs
    signal input subjectId;
    signal input cgpaScaled;   // e.g. CGPA * 100, kept as an integer field element
    signal input degreeCode;
    signal input issueDate;    // unix timestamp / days-since-epoch, field element
    signal input issuerPubKey;
    signal input salt;
    signal input schemaId;

    // Outputs
    signal output isValid;

    // 1. Compute claimsHash from the individual claim fields
    component claimsHasher = Poseidon(4);
    claimsHasher.inputs[0] <== subjectId;
    claimsHasher.inputs[1] <== cgpaScaled;
    claimsHasher.inputs[2] <== degreeCode;
    claimsHasher.inputs[3] <== issueDate;

    // 2. Verify credentialRoot
    component rootHasher = Poseidon(4);
    rootHasher.inputs[0] <== claimsHasher.out;
    rootHasher.inputs[1] <== issuerPubKey;
    rootHasher.inputs[2] <== salt;
    rootHasher.inputs[3] <== schemaId;

    rootHasher.out === credentialRoot;

    // 3. Verify Threshold (cgpaScaled >= threshold)
    component geq = GreaterEqThan(nBits);
    geq.in[0] <== cgpaScaled;
    geq.in[1] <== threshold;

    // Enforce that the condition must be met
    geq.out === 1;

    isValid <== 1;
}

// We assume values are within 64 bits
component main {public [credentialRoot, threshold]} = ClaimProver(64);
