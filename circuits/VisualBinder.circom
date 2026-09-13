pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template AbsDiff(nBits) {
    signal input in[2];
    signal output out;
    
    component lessEq = LessEqThan(nBits);
    lessEq.in[0] <== in[0];
    lessEq.in[1] <== in[1];
    
    signal diff1 <== in[1] - in[0];
    signal diff2 <== in[0] - in[1];
    
    out <== lessEq.out * diff1 + (1 - lessEq.out) * diff2;
}

template VisualBinder(N, nBits) {
    // Public Inputs
    signal input credentialRoot;
    signal input threshold;

    // Private Inputs
    signal input claimsHash;
    signal input issuerPubKey;
    signal input salt;
    
    signal input originalFeatures[N];
    signal input scannedFeatures[N];

    // Outputs
    signal output isValid;

    // 1. Compute sdcHash from originalFeatures
    component sdcHasher = Poseidon(N);
    for (var i = 0; i < N; i++) {
        sdcHasher.inputs[i] <== originalFeatures[i];
    }
    signal sdcHash <== sdcHasher.out;

    // 2. Verify credentialRoot
    component rootHasher = Poseidon(4);
    rootHasher.inputs[0] <== claimsHash;
    rootHasher.inputs[1] <== sdcHash;
    rootHasher.inputs[2] <== issuerPubKey;
    rootHasher.inputs[3] <== salt;

    rootHasher.out === credentialRoot;

    // 3. Verify L1 Distance <= threshold
    component absDiffs[N];
    signal distSums[N + 1];
    distSums[0] <== 0;

    for (var i = 0; i < N; i++) {
        absDiffs[i] = AbsDiff(nBits);
        absDiffs[i].in[0] <== originalFeatures[i];
        absDiffs[i].in[1] <== scannedFeatures[i];
        distSums[i + 1] <== distSums[i] + absDiffs[i].out;
    }
    
    component leq = LessEqThan(nBits);
    leq.in[0] <== distSums[N];
    leq.in[1] <== threshold;
    
    leq.out === 1;

    isValid <== 1;
}

// N=16 features (e.g. 4 regions x 4 features each)
// nBits=64 for values and distances
component main {public [credentialRoot, threshold]} = VisualBinder(16, 64);
