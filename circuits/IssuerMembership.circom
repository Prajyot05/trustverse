pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/mux1.circom";

// A component to check a Merkle tree proof
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];

        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root === levelHashes[levels];
}

template IssuerMembership(levels) {
    // Public Inputs
    signal input credentialRoot;
    signal input issuerRegistryRoot;

    // Private Inputs
    // claimsHash is taken as an opaque commitment here, same as in
    // NonRevocation.circom - see ClaimProver.circom for how it is derived.
    signal input claimsHash;
    signal input issuerPubKey;
    signal input salt;
    signal input schemaId;

    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Outputs
    signal output isValid;

    // 1. Verify credentialRoot
    // credentialRoot = Poseidon(claimsHash, issuerPubKey, salt, schemaId)
    component rootHasher = Poseidon(4);
    rootHasher.inputs[0] <== claimsHash;
    rootHasher.inputs[1] <== issuerPubKey;
    rootHasher.inputs[2] <== salt;
    rootHasher.inputs[3] <== schemaId;

    rootHasher.out === credentialRoot;

    // 2. Verify Membership
    component treeChecker = MerkleTreeChecker(levels);
    treeChecker.leaf <== issuerPubKey;
    treeChecker.root <== issuerRegistryRoot;
    
    for (var i = 0; i < levels; i++) {
        treeChecker.pathElements[i] <== pathElements[i];
        treeChecker.pathIndices[i] <== pathIndices[i];
    }
    
    isValid <== 1;
}

// Assuming a Merkle tree depth of 10
component main {public [credentialRoot, issuerRegistryRoot]} = IssuerMembership(10);
