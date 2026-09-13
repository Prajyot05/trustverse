pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/mux1.circom";
include "node_modules/circomlib/circuits/bitify.circom";

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

template NonRevocation(levels) {
    // Public Inputs
    signal input credentialRoot;
    signal input revocationTreeRoot;

    // Private Inputs
    signal input claimsHash;
    signal input sdcHash;
    signal input issuerPubKey;
    signal input salt;

    signal input pathElements[levels];
    
    // Outputs
    signal output isValid;

    // 1. Verify credentialRoot
    component rootHasher = Poseidon(4);
    rootHasher.inputs[0] <== claimsHash;
    rootHasher.inputs[1] <== sdcHash;
    rootHasher.inputs[2] <== issuerPubKey;
    rootHasher.inputs[3] <== salt;

    rootHasher.out === credentialRoot;

    // 2. Compute nullifier
    // nullifier is computed deterministically from claimsHash and salt
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== claimsHash;
    nullifierHasher.inputs[1] <== salt;
    
    // 3. Convert nullifier to bits for SMT path traversal
    component num2Bits = Num2Bits(levels);
    num2Bits.in <== nullifierHasher.out;

    // 4. Verify Non-Membership (leaf == 0)
    component treeChecker = MerkleTreeChecker(levels);
    treeChecker.leaf <== 0; // Empty node means not revoked
    treeChecker.root <== revocationTreeRoot;
    
    for (var i = 0; i < levels; i++) {
        treeChecker.pathElements[i] <== pathElements[i];
        treeChecker.pathIndices[i] <== num2Bits.out[i];
    }
    
    isValid <== 1;
}

// We use 64 levels for the prototype SMT to keep constraints low
component main {public [credentialRoot, revocationTreeRoot]} = NonRevocation(64);
