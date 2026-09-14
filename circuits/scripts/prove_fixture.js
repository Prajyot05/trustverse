#!/usr/bin/env node
/**
 * TrustVerse fixture generator.
 *
 * Generates real Groth16 proofs (via snarkjs.groth16.fullProve, using the
 * compiled wasm + final zkey for each circuit) for one seeded, self-
 * consistent credential, exercising:
 *
 *   - ClaimProver:      "cgpaScaled >= threshold" (selective disclosure)
 *   - NonRevocation:    a Merkle non-membership proof against a revocation
 *                       tree that already contains one *other* revoked
 *                       credential elsewhere in the tree
 *   - IssuerMembership: a Merkle membership proof of the issuer's public
 *                       key in an issuer registry tree
 *
 * Every proof is verified locally with snarkjs.groth16.verify before being
 * written out, and Solidity calldata (pA/pB/pC/pubSignals) is exported for
 * each one, so the same fixtures can be fed directly into:
 *   - contracts/test/VerificationGateway.test.ts (real proof, not a mock)
 *   - a future frontend dev-seed script (M2/M3), so a cold demo does not
 *     need to actually run snarkjs.fullProve in the browser just to show a
 *     verified proof exists.
 *
 * Usage: node scripts/prove_fixture.js
 * Output: circuits/fixtures/*.json
 */
const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");

const CIRCUITS_DIR = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(CIRCUITS_DIR, "fixtures");

const CLAIM_LEVELS_ISSUER = 10; // matches IssuerMembership(10)
const CLAIM_LEVELS_REVOCATION = 20; // matches NonRevocation(20)

function toDecArray(arr) {
  return arr.map((v) => v.toString());
}

async function poseidonHash(poseidon, inputs) {
  const F = poseidon.F;
  return F.toObject(poseidon(inputs));
}

/**
 * Hashes of an all-empty subtree at every level: emptyHash[0] = 0 (the
 * default/empty leaf), emptyHash[i] = Poseidon(emptyHash[i-1], emptyHash[i-1]).
 * emptyHash[levels] is the root of a completely empty tree of that depth.
 */
async function emptySubtreeHashes(poseidon, levels) {
  const hashes = [0n];
  for (let i = 1; i <= levels; i++) {
    hashes.push(await poseidonHash(poseidon, [hashes[i - 1], hashes[i - 1]]));
  }
  return hashes;
}

/** LSB-first bit decomposition, matching circomlib's Num2Bits output order. */
function bitsLE(value, levels) {
  const bits = [];
  let v = value;
  for (let i = 0; i < levels; i++) {
    bits.push(v & 1n);
    v >>= 1n;
  }
  return bits;
}

/**
 * Replays MerkleTreeChecker's own algorithm (see NonRevocation.circom /
 * IssuerMembership.circom) in JS to compute a self-consistent root for a
 * given leaf + path, so the fixture's public root always matches what the
 * circuit will recompute from the same private witness.
 */
async function replayMerkleRoot(poseidon, leaf, pathElements, pathIndices) {
  let levelHash = leaf;
  for (let i = 0; i < pathElements.length; i++) {
    const [a, b] = pathIndices[i] === 0n ? [levelHash, pathElements[i]] : [pathElements[i], levelHash];
    levelHash = await poseidonHash(poseidon, [a, b]);
  }
  return levelHash;
}

/**
 * Builds a Merkle proof for `leaf` at position `position`, in a tree that
 * is otherwise empty except for one other occupied leaf far away (so the
 * fixture demonstrates a non-trivial, partially-populated tree rather than
 * a literally-empty one).
 */
async function buildMerkleProof(poseidon, levels, leaf, position) {
  const empty = await emptySubtreeHashes(poseidon, levels);
  const pathIndices = bitsLE(position, levels);
  const pathElements = empty.slice(0, levels);

  // Perturb the top-level sibling to simulate "some other leaf exists in
  // the other half of the tree" (e.g. a different credential was revoked,
  // or a different issuer was registered), rather than a fully empty tree.
  pathElements[levels - 1] = await poseidonHash(poseidon, [empty[levels - 1], 1n]);

  const root = await replayMerkleRoot(poseidon, leaf, pathElements, pathIndices);
  return { pathElements, pathIndices, root };
}

async function proveAndVerify(circuitName, input) {
  const wasmPath = path.join(CIRCUITS_DIR, `${circuitName}_js`, `${circuitName}.wasm`);
  const zkeyPath = path.join(CIRCUITS_DIR, `${circuitName}_final.zkey`);
  const vkeyPath = path.join(CIRCUITS_DIR, `${circuitName}_verification_key.json`);

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

  const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));
  const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  if (!ok) {
    throw new Error(`${circuitName}: generated proof failed local verification`);
  }

  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  // exportSolidityCallData returns a single comma-joined JSON-ish string:
  // [pA[2]],[[pB[2][2]]],[pC[2]],[pubSignals[n]]
  const parsed = JSON.parse(`[${calldata}]`);
  const [pA, pB, pC, pubSignals] = parsed;

  return {
    input,
    publicSignals,
    proof,
    solidityCalldata: { pA, pB, pC, pubSignals },
  };
}

async function main() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const poseidon = await buildPoseidon();

  // ---------------------------------------------------------------------
  // Seed one self-consistent credential.
  // ---------------------------------------------------------------------
  const subjectId = 111111111111n;
  const cgpaScaled = 890n; // 8.90 / 10
  const degreeCode = 7n; // arbitrary code for "B.Tech Computer Engineering"
  const issueDate = 1780000000n; // unix timestamp
  const issuerPubKey = 222222222222n; // stand-in for the issuer's address as a field element
  const salt = 333333333333n;
  const schemaId = 1n; // "degree-v1"

  const claimsHash = await poseidonHash(poseidon, [subjectId, cgpaScaled, degreeCode, issueDate]);
  const credentialRoot = await poseidonHash(poseidon, [claimsHash, issuerPubKey, salt, schemaId]);

  console.log("Seeded credential:");
  console.log("  claimsHash     =", claimsHash.toString());
  console.log("  credentialRoot =", credentialRoot.toString());

  const fixtures = {};

  // ---------------------------------------------------------------------
  // 1. ClaimProver: prove cgpaScaled (8.90) >= threshold (8.00)
  // ---------------------------------------------------------------------
  const threshold = 800n;
  console.log("\nProving ClaimProver (cgpaScaled >= threshold)...");
  fixtures.claimProver = await proveAndVerify("ClaimProver", {
    credentialRoot: credentialRoot.toString(),
    threshold: threshold.toString(),
    subjectId: subjectId.toString(),
    cgpaScaled: cgpaScaled.toString(),
    degreeCode: degreeCode.toString(),
    issueDate: issueDate.toString(),
    issuerPubKey: issuerPubKey.toString(),
    salt: salt.toString(),
    schemaId: schemaId.toString(),
  });
  console.log("  OK - proof verifies locally");

  // ---------------------------------------------------------------------
  // 2. NonRevocation: this credential's nullifier leaf is empty (=0) in a
  //    revocation tree that has some other, unrelated occupied branch.
  // ---------------------------------------------------------------------
  console.log("\nProving NonRevocation...");
  const nullifier = await poseidonHash(poseidon, [claimsHash, salt]);
  const revocationPosition = nullifier & ((1n << BigInt(CLAIM_LEVELS_REVOCATION)) - 1n);
  const revocationProof = await buildMerkleProof(poseidon, CLAIM_LEVELS_REVOCATION, 0n, revocationPosition);

  fixtures.nonRevocation = await proveAndVerify("NonRevocation", {
    credentialRoot: credentialRoot.toString(),
    revocationTreeRoot: revocationProof.root.toString(),
    claimsHash: claimsHash.toString(),
    issuerPubKey: issuerPubKey.toString(),
    salt: salt.toString(),
    schemaId: schemaId.toString(),
    pathElements: toDecArray(revocationProof.pathElements),
  });
  console.log("  OK - proof verifies locally");
  console.log("  revocationTreeRoot =", revocationProof.root.toString());

  // ---------------------------------------------------------------------
  // 3. IssuerMembership: issuerPubKey is a member of an issuer registry
  //    tree that also has some other, unrelated occupied branch.
  // ---------------------------------------------------------------------
  console.log("\nProving IssuerMembership...");
  const issuerPosition = 0n; // place our issuer at leaf index 0
  const issuerProof = await buildMerkleProof(poseidon, CLAIM_LEVELS_ISSUER, issuerPubKey, issuerPosition);

  fixtures.issuerMembership = await proveAndVerify("IssuerMembership", {
    credentialRoot: credentialRoot.toString(),
    issuerRegistryRoot: issuerProof.root.toString(),
    claimsHash: claimsHash.toString(),
    issuerPubKey: issuerPubKey.toString(),
    salt: salt.toString(),
    schemaId: schemaId.toString(),
    pathElements: toDecArray(issuerProof.pathElements),
    pathIndices: toDecArray(issuerProof.pathIndices),
  });
  console.log("  OK - proof verifies locally");
  console.log("  issuerRegistryRoot =", issuerProof.root.toString());

  // ---------------------------------------------------------------------
  const outPath = path.join(FIXTURES_DIR, "fixtures.json");
  fs.writeFileSync(outPath, JSON.stringify(fixtures, null, 2));
  console.log(`\nWrote fixtures to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
