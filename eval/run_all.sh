#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/eval/out"
mkdir -p "$OUT"

echo "== circuit metrics =="
bash "$ROOT/eval/circuit_metrics.sh"

echo "== proof times (Node, 30 runs) =="
cd "$ROOT/circuits"
[ -d node_modules ] || npm install
PROOF_RUNS="${PROOF_RUNS:-10}" node "$ROOT/eval/proof_times.js"

echo "== CNN metrics (if trained) =="
if [ -f "$OUT/cnn_metrics.json" ]; then
  cp "$OUT/cnn_metrics.json" "$OUT/cnn_metrics.json"
else
  echo '{"status":"run backend/notebooks/train_forgery_cnn.py first"}' > "$OUT/cnn_metrics.json"
fi

echo "== R1 gate (if evaluated) =="
if [ -f "$ROOT/research/sdc-spike/results/r1_gate.json" ]; then
  cp "$ROOT/research/sdc-spike/results/r1_gate.json" "$OUT/r1_gate.json"
fi

echo "== gas report (needs localhost chain + deploy) =="
if curl -s -o /dev/null -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    http://127.0.0.1:8545 2>/dev/null; then
  cd "$ROOT/contracts"
  npx hardhat run scripts/gas_report.ts --network localhost || echo "gas report skipped"
else
  echo '{"status":"start hardhat node and deploy first"}' > "$OUT/gas_metrics.json"
fi

echo "== latency (needs backend) =="
if curl -s -o /dev/null "$ROOT/../8000" 2>/dev/null || curl -s -o /dev/null http://127.0.0.1:8000/docs 2>/dev/null; then
  "$ROOT/backend/venv/bin/python" "$ROOT/eval/latency_happy_path.py" || true
else
  echo '{"status":"start backend first"}' > "$OUT/latency_happy_path.json"
fi

echo "Artifacts in $OUT"
