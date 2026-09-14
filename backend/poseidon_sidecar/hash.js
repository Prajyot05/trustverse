#!/usr/bin/env node
/**
 * TrustVerse Poseidon sidecar.
 *
 * Reads a single line of JSON from stdin: an array of decimal-string field
 * elements, e.g. ["123", "456", "789", "0"].
 *
 * Writes a single line of JSON to stdout: { "hash": "<decimal string>" }.
 *
 * This uses circomlibjs's Poseidon implementation, which is the reference
 * JS implementation matching circomlib's poseidon.circom used by
 * ClaimProver.circom, NonRevocation.circom and IssuerMembership.circom.
 * Using the same library on both sides of the fence is what guarantees the
 * backend's credentialRoot matches what the circuits will recompute.
 */
const { buildPoseidon } = require("circomlibjs");

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("No input provided on stdin");
  }

  const inputs = JSON.parse(raw);
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Input must be a non-empty JSON array of field elements");
  }

  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const fieldInputs = inputs.map((v) => BigInt(v));
  const result = poseidon(fieldInputs);
  const hashDecimal = F.toString(result, 10);

  process.stdout.write(JSON.stringify({ hash: hashDecimal }) + "\n");
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
});
