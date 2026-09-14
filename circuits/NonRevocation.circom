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
    // claimsHash is taken as an opaque commitment here (this circuit does
    // not need to know the individual claim fields, only that they hash to
    // the same claimsHash used when the credentialRoot was anchored).
    signal input claimsHash;
    signal input issuerPubKey;
    signal input salt;
    signal input schemaId;

    signal input pathElements[levels];
    
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

    // 2. Compute nullifier
    // nullifier is computed deterministically from claimsHash and salt
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== claimsHash;
    nullifierHasher.inputs[1] <== salt;
    
    // 3. Convert nullifier to bits for SMT path traversal.
    // IMPORTANT: nullifierHasher.out is a full BN128 field element (up to
    // ~254 bits). Num2Bits(n) constrains that its output bits recompose to
    // exactly `in`, which is only satisfiable if `in < 2**n` - true for
    // essentially no Poseidon digest when n = levels (20, or even 64).
    // We therefore decompose at the full field width (254 bits safely
    // covers any BN128 scalar field element) and only use the low
    // `levels` bits - the ones Num2Bits emits least-significant-bit-first
    // - to select the tree position.
    component num2Bits = Num2Bits(254);
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

// 20 levels supports a sparse Merkle tree of up to 2^20 (~1M) credentials,
// which comfortably covers a university-scale revocation registry while
// keeping the circuit (and therefore proving time and gas) small. A
// production multi-tenant deployment could raise this at the cost of a
// bigger circuit and a larger trusted setup.
component main {public [credentialRoot, revocationTreeRoot]} = NonRevocation(20);
