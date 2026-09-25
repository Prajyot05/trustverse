# TrustVerse: Privacy-Preserving Verification of Academic Credentials with zk-SNARKs, On-Chain Non-Revocation, and Forensic Fallback for Legacy Documents

## Abstract

We present TrustVerse, a system for privacy-preserving verification of academic credentials. A university issues W3C Verifiable Credentials with a Poseidon commitment anchored on Ethereum. Holders prove selective claims (e.g., CGPA ≥ threshold) via Groth16 zk-SNARKs without revealing attribute values. Non-revocation is enforced through a sparse Merkle tree whose root is published on-chain. For legacy scanned documents, an Error Level Analysis (ELA) CNN provides a secondary authenticity signal. We report circuit artifact sizes, proof generation latency, on-chain verification gas, CNN metrics on synthetic certificates, and a negative result for DCT-based visual binding (SDC).

## 1. Introduction

Credential fraud and over-disclosure of personal data are dual failures of traditional verification. TrustVerse combines zero-knowledge selective disclosure, on-chain anchoring, and revocable credentials with optional AI forensics for paper scans.

## 2. Related Work

Blockcerts, Hyperledger Aries/AnonCreds, EBSI, and recent zk-credential systems motivate our design. Document forensics (ELA, CNN tamper detection) is treated as a supporting module, not the primary trust anchor.

## 3. System Design

**Roles:** Issuer (university), Holder (student), Verifier (employer).

**Commitment layout:**
- `claimsHash = Poseidon(subjectId, cgpaScaled, degreeCode, issueDate)`
- `credentialRoot = Poseidon(claimsHash, issuerPubKey, salt, schemaId)`

**Circuits:** ClaimProver (threshold), NonRevocation (20-level sparse Merkle non-membership), IssuerMembership (registry membership).

**Contracts:** IssuerRegistry, CredentialAnchor, RevocationRegistry, VerificationGateway with Groth16 verifiers.

**Forensics:** ELA preprocessing + small CNN; TrustVerse Score fuses anchor, issuer, revocation, and CNN signals.

**Product layer (not part of the ZK claim):** inbox notifications, an issuer directory, share links, templates, staff records, batch issuance, and a backend relay anchor. Of the predicate catalog, only `cgpa_gte` is proved with ClaimProver. `degree_eq`, `year_range`, `graduated`, and `issuer_set` are evaluated in the API after decryption. Share-link results use that server check. The directory "verified" flag is set by an API call and is not a DNS or `did:web` proof. API keys and webhooks are stored; they are not enforced or delivered.

See `docs/architecture.md` for the sequence diagram aligned with the implementation.

## 4. Security and Privacy Analysis

On the Groth16 path, the verifier learns only that a proof passed (threshold met, credential anchored, not revoked at the submitted root). Attribute values stay out of the public inputs. Stale revocation roots are rejected by the gateway. Share links and the non-`cgpa_gte` predicates do not have this property: the server decrypts the credential to evaluate them.

Demo encryption is `SHA256("trustverse-demo-key:" + holder DID)` unless a holder public key was stored at issuance, in which case the key is `SHA256("trustverse-ecies:" + pubkey hex)`. The second form is a KDF over the public key, not ECIES; anyone who can read that column can decrypt.

## 5. Evaluation

Reproducible scripts under `eval/` produce:

| Metric | Source |
|--------|--------|
| Circuit wasm/zkey sizes | `eval/circuit_metrics.sh` |
| Proof gen / verify time | `eval/proof_times.js` |
| On-chain gas | `eval/gas_report.ts` |
| CNN accuracy/F1/AUC | `eval/out/cnn_metrics.json` |
| API latency stages | `eval/latency_happy_path.py` |
| SDC / region-hash gate | `eval/out/r1_gate.json` |

Fill tables from generated JSON before submission.

## 6. Limitations and Future Work

- **Visual binding (R1):** Original DCT-SDC achieved 100% FAR on tampered certificates. Region-hash spike results are in `eval/out/r1_gate.json`; integration is gated on FAR < 10% at FRR < 5%.
- **Trusted setup:** Local Groth16 ceremony only; production requires a proper MPC.
- **Holder encryption:** binding the AES key to a stored public key is not ECIES. Future work is encryption under the holder secret key.
- **Predicates other than `cgpa_gte`:** server-side checks. Wiring them into a circuit, and routing IssuerMembership through the gateway, is future work.
- **Directory verification, API keys, webhooks:** records only. Domain control, key enforcement, and webhook delivery are future work.

## 7. Conclusion

TrustVerse demonstrates an end-to-end privacy-preserving credential flow with measurable ZK and on-chain costs, honest reporting of failed visual-binding research, and forensic fallback for legacy documents.
