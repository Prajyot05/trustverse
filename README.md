# TrustVerse

Privacy-preserving academic credential verification using **W3C Verifiable Credentials**, **Groth16 zk-SNARKs** (selective disclosure + Merkle non-revocation), **Ethereum anchoring**, and an **ELA-CNN forensics** module for legacy document scans.

## What works today

- Issuer registers on-chain (`IssuerRegistry`) and issues encrypted credentials with Poseidon commitments
- Issuer anchors credentials via MetaMask (`CredentialAnchor`)
- Holder wallet decrypts credentials and generates **ClaimProver** + **NonRevocation** proofs in-browser (snarkjs)
- Verifier creates threshold requests; proofs are verified on-chain via **VerificationGateway**
- Revocation Merkle tree (backend) with root published to the gateway; issuer revoke UI
- Guided demo mode (`POST /api/v1/demo/seed`) with seeded university, students, revoked credential, pending request
- ELA heatmap + CNN score on verifier scan upload (train weights with included notebook)
- Product layer on `/api/v1/product`: inbox, issuer directory, share links, templates, staff, batch issue, and relay anchor. See [docs/architecture.md](docs/architecture.md) for what is a Groth16 proof and what is a server-side check

`degree_eq`, `year_range`, `graduated`, and `issuer_set` are evaluated in `backend/app/core/predicates.py` after the server decrypts the credential. Only `cgpa_gte` is a ClaimProver proof. Share links (`/present`, `/embed/verify?share=`) use that server check. `POST /api/v1/product/directory/verify` sets a verified flag; it does not prove DNS or `did:web` control. API keys and webhooks are stored; keys are not required on routes, and webhook URLs are not called.

## What is research-only

- **SDC / VisualBinder** visual binding under `research/sdc-spike/` — original DCT features failed evaluation (100% FAR). Region-hash R1 spike is gated; see `eval/out/r1_gate.json`.

## Quick start

```bash
./scripts/dev.sh
```

This starts Hardhat, deploys contracts, writes addresses into backend/frontend env, starts the API (`:8000`) and frontend (`:3000`), trains the CNN on first run if needed, and seeds demo data.

Open [http://localhost:3000](http://localhost:3000). Follow **[Demo walkthrough](#demo-walkthrough-full-app)** below for the full experience.

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

# Seed demo data
curl -X POST http://localhost:8000/api/v1/demo/seed
```

### Train forensics CNN

```bash
cd backend && source venv/bin/activate
python notebooks/train_forgery_cnn.py
```

Outputs `backend/models/forgery_cnn.pt` and `eval/out/cnn_metrics.json`.

---

## Demo walkthrough (full app)

Use this path to exercise **every product feature** with the seeded demo. Architecture detail: [`docs/architecture.md`](docs/architecture.md).

### 0. Prerequisites

1. **Node.js 18+**, **Python 3.10+**, and MetaMask (browser extension).
2. Start the stack with `./scripts/dev.sh` (or manual setup above). Wait until:
   - Hardhat RPC: `http://127.0.0.1:8545`
   - API: [http://localhost:8000/docs](http://localhost:8000/docs)
   - App: [http://localhost:3000](http://localhost:3000)
3. In MetaMask, add a network:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
4. Import Hardhat accounts (private keys from `npx hardhat node` output, or the well-known local keys). Map them as follows:

| Account | Role | Address (prefix) | Use for |
|---------|------|------------------|---------|
| #0 | Issuer (university) | `0xf39Fd6…92266` | `/issuer` — register, issue, revoke |
| #1 | Alice (holder) | `0x709979…c79C8` | `/wallet` — decrypt, prove |
| #2 | Bob (holder) | `0x3C44Cd…293BC` | `/wallet` — see revoked credential |
| #3 | Verifier (employer) | `0x90F79b…93b906` | `/verifier` — create requests |

> Hardhat accounts are **public demo keys**. Never use them on a real network.

### 1. Seed guided demo data

On the landing page, click **Run guided demo**, or:

```bash
curl -X POST http://localhost:8000/api/v1/demo/seed
```

This creates:

- **TrustVerse University** (`did:ethr:trustverse-university`) registered on-chain (account #0), domain `trustverse.university`, accreditation `NAAC A++`, verified flag set.
- **Alice** — CGPA **8.9**, status **Active**, credential anchored.
- **Bob** — CGPA **6.4**, status **Revoked** (Merkle leaf set + root published).
- One **pending** verification request: verifier (#3) asks Alice for **CGPA ≥ 8.0**.

### 2. Holder wallet — Alice sees her credential

1. Switch MetaMask to account **#1 (Alice)**.
2. Open [http://localhost:3000/wallet](http://localhost:3000/wallet) and connect.
3. Confirm you see:
   - Degree (e.g. Bachelor of Computer Engineering)
   - CGPA **8.9**
   - Status **Active** / anchored
   - Poseidon commitment
4. Under **Pending requests**, open the seeded request (CGPA ≥ 8.0), or use the QR/deep link from the verifier page later.

### 3. ZK proof — Alice answers without revealing CGPA

1. Still as Alice (#1), on the pending request click **Prove** / generate proofs.
2. The wallet will:
   - Build **ClaimProver** inputs from the real credential (not mocks)
   - Fetch the revocation Merkle path from the API
   - Run snarkjs in-browser (**ClaimProver** + **NonRevocation**)
   - Prompt MetaMask twice for `VerificationGateway` txs (approve both)
3. Wait until proofs submit successfully. This can take a few seconds (NonRevocation is heavier).

**What the verifier learns:** pass/fail for “CGPA ≥ 8.0” and “not revoked” — **not** the value 8.9.

### 4. Verifier — see result (no attributes disclosed)

1. Switch MetaMask to account **#3 (Verifier)**.
2. Open [http://localhost:3000/verifier](http://localhost:3000/verifier) and connect.
3. Either:
   - **Poll the seeded request** if the UI still has it after you created/shared it, or
   - **Create a new request**: holder DID = Alice’s `did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8`, attribute `cgpa`, threshold `8.0`, then share the QR / `/wallet?request=<id>` with Alice and repeat step 3.
4. When status is **fulfilled**, confirm the UI shows pass/fail, issuer context, tx/block reference, and a panel that **no attribute values were disclosed**.

### 5. Revoked holder — Bob cannot pass non-revocation

1. Switch MetaMask to account **#2 (Bob)**.
2. Open `/wallet` and connect.
3. Confirm Bob’s credential shows **Revoked** (CGPA 6.4 was seeded revoked).
4. Optional: as verifier (#3), create a request for Bob’s DID. Bob should **fail** NonRevocation (or be blocked before proving) because his leaf is revoked in the Merkle tree.

### 6. Issuer portal — register, issue, revoke

1. Switch MetaMask to account **#0 (Issuer)**.
2. Open [http://localhost:3000/issuer](http://localhost:3000/issuer) and connect.
3. **Register** (if not already seeded): call self-register on-chain + API. Demo seed usually already registered the university.
4. **Issue a new credential** (optional live path):
   - Holder DID: use Alice’s DID or a fresh Hardhat account DID (`did:ethr:<address>`)
   - Degree, CGPA, date
   - Submit → approve MetaMask **anchor** tx → credential becomes Active
5. **Revoke**: pick an Active credential, revoke with a reason. Confirm:
   - Status flips to Revoked in the issuer list / holder wallet
   - Revocation root updates on the gateway (stale NonRevocation proofs are rejected)

### 7. AI forensics — legacy scan path

1. As verifier (#3), stay on `/verifier`.
2. Upload a certificate **image** (PNG/JPG) in the forensics / scan section.
   - Authentic samples: `research/sdc-spike/data/templates/`
   - Tampered samples: `research/sdc-spike/data/tampered/`
3. Confirm you see:
   - **ELA heatmap** beside the upload
   - CNN authenticity probability
   - **TrustVerse Score** with weighted components (AI, issuer, on-chain, lineage)

This path is **secondary** to ZK verification — it is for paper/legacy scans, not a replacement for the cryptographic happy path.

### 8. Public verify page

1. Open [http://localhost:3000/verify](http://localhost:3000/verify) (no special wallet required for lookup).
2. Paste a `credentialHash` from Alice’s wallet or the issuer list (SHA-256 hash of the VC, not the Poseidon root).
3. Confirm anchor status and revocation flag from chain/API.

### 8b. Directory, present, and inbox

These sit on the product API. They do not replace the ZK path in steps 3–4.

1. [http://localhost:3000/directory](http://localhost:3000/directory) lists issuers. The seeded university shows domain `trustverse.university` and accreditation `NAAC A++`.
2. As Alice (`#1`), open [http://localhost:3000/present](http://localhost:3000/present). The page creates a 24-hour share for the first credential with predicate `graduated` and shows a QR. Opening that link runs the **server-side** predicate check, not ClaimProver.
3. The header inbox lists notifications for the connected DID (credential issued, revoked, proof requested, proof submitted). Demo mode filters by recipient. Email is not sent unless `SMTP_HOST` is set.
4. [http://localhost:3000/get-started](http://localhost:3000/get-started) picks a role and routes into the matching portal. `/embed/verify?hash=` is the public lookup; `/embed/verify?share=` is the share check.

### 9. Suggested 5-minute examiner script

| Minute | Action |
|--------|--------|
| 0–1 | `./scripts/dev.sh` already running; landing → **Run guided demo** |
| 1–2 | Alice (#1) `/wallet` → show decrypted CGPA 8.9 + Active |
| 2–4 | Alice proves pending request; approve MetaMask txs |
| 4–5 | Verifier (#3) `/verifier` → fulfilled, “no attributes disclosed” |
| Extra | Bob revoked; issuer revoke; upload tampered scan for ELA/CNN |

### Demo troubleshooting

| Symptom | Fix |
|---------|-----|
| MetaMask wrong chain | Switch to Hardhat Local, chain ID `31337` |
| Empty wallet for Alice | Re-seed: `curl -X POST http://localhost:8000/api/v1/demo/seed`; confirm account #1 |
| Proof / contract errors | Ensure `./scripts/dev.sh` deployed addresses into `frontend/.env.local`; restart frontend |
| CNN / heatmap missing | `python backend/notebooks/train_forgery_cnn.py` then restart API |
| Port in use | Stop old Hardhat/API/Next processes; re-run `./scripts/dev.sh` |

---

## Directory layout

| Path | Purpose |
|------|---------|
| `frontend/` | Next.js — issuer, wallet, verifier, directory, present, embed |
| `backend/` | FastAPI — issuance, revocation tree, forensics, product layer, demo seed |
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
