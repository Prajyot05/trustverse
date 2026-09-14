#!/usr/bin/env bash
# Collect circuit artifact sizes and constraint counts (from compiled r1cs info if present).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/eval/out"
mkdir -p "$OUT"
CSV="$OUT/circuit_metrics.csv"
echo "circuit,wasm_bytes,zkey_bytes,vkey_bytes,r1cs_bytes" > "$CSV"

for name in ClaimProver NonRevocation IssuerMembership; do
  base="$ROOT/circuits/$name"
  wasm="$ROOT/circuits/${name}_js/${name}.wasm"
  zkey="$ROOT/circuits/${name}_final.zkey"
  vkey="$ROOT/circuits/${name}_verification_key.json"
  r1cs="${base}.r1cs"
  wasm_b=$([ -f "$wasm" ] && stat -f%z "$wasm" 2>/dev/null || stat -c%s "$wasm" 2>/dev/null || echo 0)
  zkey_b=$([ -f "$zkey" ] && stat -f%z "$zkey" 2>/dev/null || stat -c%s "$zkey" 2>/dev/null || echo 0)
  vkey_b=$([ -f "$vkey" ] && stat -f%z "$vkey" 2>/dev/null || stat -c%s "$vkey" 2>/dev/null || echo 0)
  r1cs_b=$([ -f "$r1cs" ] && stat -f%z "$r1cs" 2>/dev/null || stat -c%s "$r1cs" 2>/dev/null || echo 0)
  echo "$name,$wasm_b,$zkey_b,$vkey_b,$r1cs_b" >> "$CSV"
done

echo "Wrote $CSV"
