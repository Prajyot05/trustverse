pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * CredentialValidator Circuit
 * Proves that:
 * 1. The private attributes (subjectId, value, salt) hash to the public poseidonCommitment.
 * 2. The private value satisfies the threshold condition (value >= threshold).
 */
template CredentialValidator(nBits) {
    // Public Inputs
    signal input poseidonCommitment;
    signal input threshold;

    // Private Inputs
    signal input subjectId;
    signal input value;
    signal input salt;

    // Outputs
    signal output isValid;

    // 1. Verify Poseidon Commitment
    component hasher = Poseidon(3);
    hasher.inputs[0] <== subjectId;
    hasher.inputs[1] <== value;
    hasher.inputs[2] <== salt;

    hasher.out === poseidonCommitment;

    // 2. Verify Threshold (value >= threshold)
    // GreaterEqThan component from circomlib
    component geq = GreaterEqThan(nBits);
    geq.in[0] <== value;
    geq.in[1] <== threshold;
    
    // Enforce that the condition must be met
    geq.out === 1;

    isValid <== 1;
}

// We assume values are within 64 bits
component main {public [poseidonCommitment, threshold]} = CredentialValidator(64);
