# TrustVerse circuits

Three Groth16 circuits, all sharing one commitment layout:

```
claimsHash     = Poseidon(subjectId, cgpaScaled, degreeCode, issueDate)
credentialRoot = Poseidon(claimsHash, issuerPubKey, salt, schemaId)
```

This layout is implemented once and used everywhere: `circuits/*.circom`,
`backend/app/core/poseidon.py` + `backend/app/core/commitment.py` (via the
`backend/poseidon_sidecar` Node/circomlibjs sidecar, so the backend and the
circuits agree bit-for-bit), and `circuits/scripts/prove_fixture.js`.

| Circuit | Public inputs | Proves |
|---|---|---|
| `ClaimProver` | `credentialRoot`, `threshold` | `cgpaScaled >= threshold`, consistent with `credentialRoot` |
| `NonRevocation` | `credentialRoot`, `revocationTreeRoot` | This credential's nullifier is *absent* from the revocation tree (20 levels, ~1M credentials) |
| `IssuerMembership` | `credentialRoot`, `issuerRegistryRoot` | `issuerPubKey` is present in an issuer registry tree (10 levels, ~1k issuers) |

The product predicate catalog (`cgpa_gte`, `degree_eq`, `year_range`, `graduated`, `issuer_set`) is not five circuits. Only `cgpa_gte` is ClaimProver. The other four are evaluated in `backend/app/core/predicates.py`. IssuerMembership is compiled and deployed; `VerificationGateway` does not call it.

`VisualBinder.circom` (the fourth circuit from the `zk-cavb` spike) is **not**
part of this set. It lives in `research/sdc-spike/` because
`research/sdc-spike/evaluate_sdc.py` shows its underlying feature extractor
cannot separate benign scan distortions from actual tampering (0% FRR but
100% FAR on the committed synthetic set) - see that directory and
`docs/architecture.md` for the full writeup.

## What's committed vs. regenerated

For each circuit above, this directory commits:

- `<Circuit>.circom` - the source.
- `<Circuit>.r1cs`, `<Circuit>.sym` - compiled constraint system + symbols.
- `<Circuit>_js/<Circuit>.wasm` (+ witness calculator) - for in-browser/Node witness generation.
- `<Circuit>_final.zkey` - the Groth16 proving key after the (locally-simulated,
  non-production) trusted setup contribution.
- `<Circuit>_verification_key.json` - the verification key, mirrored on-chain
  as `contracts/contracts/verifiers/<Circuit>Verifier.sol`.

`build/` and `node_modules/` are gitignored scratch space used while
compiling; nothing under `build/` is authoritative.

## Rebuilding

```bash
cd circuits
npm install
bash scripts/build_all_circuits.sh   # compiles + trusted setup + Solidity verifiers
node scripts/prove_fixture.js        # generates circuits/fixtures/fixtures.json
```

`prove_fixture.js` produces one seeded, self-consistent credential and a
real Groth16 proof for each circuit (verified locally before being written
out), plus ready-to-use Solidity calldata. `contracts/test/VerificationGateway.test.ts`
consumes `circuits/fixtures/fixtures.json` directly, so the contract tests
exercise real proofs, not placeholder calldata.

**Note on the trusted setup:** the Powers of Tau ceremony and the per-circuit
Phase 2 contribution here use a single, non-random contributor
(`-e="random text"` / similar) purely so the whole pipeline is reproducible
for grading/demo purposes. This is **not** a secure trusted setup and must
never be used for anything beyond a student project / research prototype.
