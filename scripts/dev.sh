#!/usr/bin/env bash
#
# One-command local dev bootstrap for TrustVerse.
#
# Starts a local Hardhat chain, deploys the contract suite, writes the
# resulting addresses into backend/.env, then starts the FastAPI backend
# and the Next.js frontend. Ctrl-C stops everything it started.
#
# Usage: ./scripts/dev.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

PIDS=()

cleanup() {
  echo ""
  echo "Shutting down dev stack..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "== TrustVerse dev bootstrap =="

# ---------------------------------------------------------------------------
# 1. Contracts: install deps, start local Hardhat node, deploy
# ---------------------------------------------------------------------------
echo "[1/5] Installing contracts dependencies (if needed)..."
cd "$CONTRACTS_DIR"
[ -d node_modules ] || npm install

echo "[2/5] Starting local Hardhat node..."
npx hardhat node > "$ROOT_DIR/.hardhat-node.log" 2>&1 &
HARDHAT_PID=$!
PIDS+=("$HARDHAT_PID")

# Wait for the JSON-RPC endpoint to come up.
echo "Waiting for Hardhat node on http://127.0.0.1:8545 ..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -X POST -H "Content-Type: application/json" \
      --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      http://127.0.0.1:8545; then
    echo "Hardhat node is up."
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "Hardhat node did not start in time. See .hardhat-node.log" >&2
    exit 1
  fi
done

echo "[3/5] Deploying contracts to localhost..."
npx hardhat run scripts/deploy.ts --network localhost

ADDR_FILE="$CONTRACTS_DIR/deployed-addresses.json"
if [ ! -f "$ADDR_FILE" ]; then
  echo "Expected $ADDR_FILE after deploy, but it was not found." >&2
  exit 1
fi

ISSUER_REGISTRY=$(node -pe "require('$ADDR_FILE').issuerRegistry")
CREDENTIAL_ANCHOR=$(node -pe "require('$ADDR_FILE').credentialAnchor")
REVOCATION_REGISTRY=$(node -pe "require('$ADDR_FILE').revocationRegistry")
CLAIM_PROVER_VERIFIER=$(node -pe "require('$ADDR_FILE').claimProverVerifier")
NON_REVOCATION_VERIFIER=$(node -pe "require('$ADDR_FILE').nonRevocationVerifier")
ISSUER_MEMBERSHIP_VERIFIER=$(node -pe "require('$ADDR_FILE').issuerMembershipVerifier")
VERIFICATION_GATEWAY=$(node -pe "require('$ADDR_FILE').verificationGateway")

echo "Deployed addresses:"
echo "  IssuerRegistry:            $ISSUER_REGISTRY"
echo "  CredentialAnchor:          $CREDENTIAL_ANCHOR"
echo "  RevocationRegistry:        $REVOCATION_REGISTRY"
echo "  ClaimProverVerifier:       $CLAIM_PROVER_VERIFIER"
echo "  NonRevocationVerifier:     $NON_REVOCATION_VERIFIER"
echo "  IssuerMembershipVerifier:  $ISSUER_MEMBERSHIP_VERIFIER"
echo "  VerificationGateway:       $VERIFICATION_GATEWAY"

# ---------------------------------------------------------------------------
# 2. Backend: venv, requirements, .env, run
# ---------------------------------------------------------------------------
echo "[4/5] Preparing backend..."
cd "$BACKEND_DIR"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
./venv/bin/pip install -q -r requirements.txt

ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
fi

# Rewrite (or append) the contract address lines with the freshly deployed ones.
python3 - "$ENV_FILE" "$ISSUER_REGISTRY" "$CREDENTIAL_ANCHOR" "$REVOCATION_REGISTRY" "$CLAIM_PROVER_VERIFIER" "$NON_REVOCATION_VERIFIER" "$ISSUER_MEMBERSHIP_VERIFIER" "$VERIFICATION_GATEWAY" <<'PYEOF'
import sys

env_file, issuer_registry, anchor, revocation, claim_verifier, nonrev_verifier, issuer_verifier, gateway = sys.argv[1:9]
updates = {
    "ETH_RPC_URL": "http://127.0.0.1:8545",
    "ISSUER_REGISTRY_ADDRESS": issuer_registry,
    "ANCHOR_CONTRACT_ADDRESS": anchor,
    "REVOCATION_CONTRACT_ADDRESS": revocation,
    "CLAIM_PROVER_VERIFIER_ADDRESS": claim_verifier,
    "NON_REVOCATION_VERIFIER_ADDRESS": nonrev_verifier,
    "ISSUER_MEMBERSHIP_VERIFIER_ADDRESS": issuer_verifier,
    "VERIFICATION_GATEWAY_ADDRESS": gateway,
}

with open(env_file) as f:
    lines = f.readlines()

seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0].strip()
    if key in updates:
        out.append(f'{key}="{updates[key]}"\n')
        seen.add(key)
    else:
        out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f'{key}="{value}"\n')

with open(env_file, "w") as f:
    f.writelines(out)
PYEOF

echo "Wrote contract addresses to $ENV_FILE"

echo "Starting FastAPI backend on :8000..."
./venv/bin/uvicorn app.main:app --reload --port 8000 > "$ROOT_DIR/.backend.log" 2>&1 &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")

# ---------------------------------------------------------------------------
# 3. Frontend
# ---------------------------------------------------------------------------
echo "[5/5] Preparing frontend..."
cd "$FRONTEND_DIR"
[ -d node_modules ] || npm install
[ -f .env.local ] || cp .env.example .env.local

echo "Starting Next.js frontend on :3000..."
npm run dev > "$ROOT_DIR/.frontend.log" 2>&1 &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")

echo ""
echo "== TrustVerse dev stack is up =="
echo "  Hardhat RPC:  http://127.0.0.1:8545"
echo "  Backend API:  http://127.0.0.1:8000"
echo "  Frontend:     http://127.0.0.1:3000"
echo ""
echo "Logs: .hardhat-node.log, .backend.log, .frontend.log (repo root)"
echo "Press Ctrl-C to stop everything."

wait
