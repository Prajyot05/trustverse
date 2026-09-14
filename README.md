# TrustVerse

Privacy-preserving academic credential verification using **W3C Verifiable Credentials**, **Groth16 zk-SNARKs** (selective disclosure + Merkle non-revocation), **Ethereum anchoring**, and an **ELA-CNN forensics** module for legacy document scans.

## What works today

- Issuer registers on-chain (`IssuerRegistry`) and issues encrypted credentials with Poseidon commitments
- Issuer anchors credentials via MetaMask (`CredentialAnchor`)
- Holder wallet decrypts credentials and generates **ClaimProver** + **NonRevocation** proofs in-browser (snarkjs)
- Verifier creates threshold requests; proofs are verified on-chain via **VerificationGateway**
- Revocation Merkle tree (backend) with root published to the gateway; issuer revoke UI
- Guided demo mode (`POST /demo/seed`) with seeded university, students, revoked credential, pending request
- ELA heatmap + CNN score on verifier scan upload (train weights with included notebook)

## What is research-only

- **SDC / VisualBinder** visual binding under `research/sdc-spike/` — original DCT features failed evaluation (100% FAR). Region-hash R1 spike is gated; see `eval/out/r1_gate.json`.

## Quick start

```bash
./scripts/dev.sh
```

Then open [http://localhost:3000](http://localhost:3000) and click **Run guided demo**, or:

```bash
curl -X POST http://localhost:8000/api/v1/demo/seed
```

### Manual setup

```bash
# Contracts
cd contracts && npm install
npx hardhat node   # terminal 1
npx hardhat run scripts/deploy.ts --network localhost   # terminal 2

# Backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill contract addresses from contracts/deployed-addresses.json
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev
```

### Train forensics CNN

```bash
cd backend && source venv/bin/activate
python notebooks/train_forgery_cnn.py
```

Outputs `backend/models/forgery_cnn.pt` and `eval/out/cnn_metrics.json`.

## Directory layout

| Path | Purpose |
|------|---------|
| `frontend/` | Next.js — issuer, wallet, verifier portals |
| `backend/` | FastAPI — issuance, revocation tree, forensics, demo seed |
| `contracts/` | Hardhat — registry, anchor, revocation, gateway, Groth16 verifiers |
| `circuits/` | ClaimProver, NonRevocation, IssuerMembership (+ fixtures) |
| `eval/` | Reproducible evaluation scripts |
| `research/sdc-spike/` | Gated visual-binding research (not product spine) |
| `docs/` | Architecture and paper draft |

## Evaluation

```bash
bash eval/run_all.sh
```

Produces circuit sizes, proof timings, gas report (with local chain), CNN metrics, and R1 gate results under `eval/out/`.

## Stack

- Next.js 14, Tailwind, ethers v6, snarkjs (browser proving)
- FastAPI, SQLAlchemy (SQLite), PyTorch, web3.py
- Hardhat, Solidity 0.8.x, Circom 2, Groth16

## Paper

Draft: `docs/paper_draft.md` — target framing for privacy-preserving credentials with on-chain non-revocation and forensic fallback.
