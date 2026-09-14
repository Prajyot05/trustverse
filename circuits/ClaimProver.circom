pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * ClaimProver Circuit
 * Proves that:
 * 1. The private claims (subjectId, value) hash to `claimsHash`.
 * 2. Poseidon(claimsHash, sdcHash, issuerPubKey, salt) == credentialRoot
 * 3. The private value satisfies the threshold condition (value >= threshold).
 */
template ClaimProver(nBits) {
    // Public Inputs
    signal input credentialRoot;
    signal input threshold;

    // Private Inputs
    signal input subjectId;
    signal input value;
    signal input sdcHash;
    signal input issuerPubKey;
    signal input salt;

    // Outputs
    signal output isValid;

    // 1. Compute claimsHash
    component claimsHasher = Poseidon(2);
    claimsHasher.inputs[0] <== subjectId;
    claimsHasher.inputs[1] <== value;
    
    // 2. Verify credentialRoot
    component rootHasher = Poseidon(4);
    rootHasher.inputs[0] <== claimsHasher.out;
    rootHasher.inputs[1] <== sdcHash;
    rootHasher.inputs[2] <== issuerPubKey;
    rootHasher.inputs[3] <== salt;

    rootHasher.out === credentialRoot;

    // 3. Verify Threshold (value >= threshold)
    // GreaterEqThan component from circomlib
    component geq = GreaterEqThan(nBits);
    geq.in[0] <== value;
    geq.in[1] <== threshold;
    
    // Enforce that the condition must be met
    geq.out === 1;

    isValid <== 1;
}

// We assume values are within 64 bits
component main {public [credentialRoot, threshold]} = ClaimProver(64);
