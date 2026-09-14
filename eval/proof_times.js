#!/usr/bin/env node
/**
 * Measure Groth16 proof generation + verification time in Node (30 runs each circuit).
 * Output: eval/out/proof_times.json
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const snarkjs = require(path.join(ROOT, "circuits", "node_modules", "snarkjs"));

const FIX = path.join(ROOT, "circuits", "fixtures", "fixtures.json");
const OUT = path.join(ROOT, "eval", "out", "proof_times.json");
const RUNS = parseInt(process.env.PROOF_RUNS || "30", 10);

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    mean_ms: sum / sorted.length,
    p50_ms: sorted[Math.floor(sorted.length * 0.5)],
    p95_ms: sorted[Math.floor(sorted.length * 0.95)],
    min_ms: sorted[0],
    max_ms: sorted[sorted.length - 1],
  };
}

async function benchCircuit(name, wasmRel, zkeyRel, inputs) {
  const wasm = path.join(ROOT, "circuits", wasmRel);
  const zkey = path.join(ROOT, "circuits", zkeyRel);
  const proveTimes = [];
  const verifyTimes = [];
  let lastProof;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasm, zkey);
    proveTimes.push(performance.now() - t0);
    lastProof = { proof, publicSignals };
  }
  const vkey = await snarkjs.zKey.exportVerificationKey(zkey);
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const ok = await snarkjs.groth16.verify(vkey, lastProof.publicSignals, lastProof.proof);
    verifyTimes.push(performance.now() - t0);
    if (!ok) throw new Error(`${name} verify failed`);
  }
  return { prove: stats(proveTimes), verify: stats(verifyTimes) };
}

async function main() {
  const fx = JSON.parse(fs.readFileSync(FIX, "utf8"));
  const claimInputs = fx.claimProver.input;
  const nonRevInputs = fx.nonRevocation.input;

  const result = {
    runs: RUNS,
    environment: "node",
    ClaimProver: await benchCircuit(
      "ClaimProver",
      "ClaimProver_js/ClaimProver.wasm",
      "ClaimProver_final.zkey",
      claimInputs
    ),
    NonRevocation: await benchCircuit(
      "NonRevocation",
      "NonRevocation_js/NonRevocation.wasm",
      "NonRevocation_final.zkey",
      nonRevInputs
    ),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log("Wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
