# TrustVerse 🌐🛡️

TrustVerse is an end-to-end, privacy-preserving institutional credential verification platform that combines **W3C Verifiable Credentials**, **Ethereum Smart Contracts**, **Zero-Knowledge Proofs (zk-SNARKs)**, and **AI Forensics** to completely eliminate credential fraud.

## Architecture

1. **W3C Verifiable Credentials**: Credentials are issued as standard W3C VCs, encrypted, and pinned to IPFS. The hash of the credential is what gets anchored on-chain.
2. **Ethereum Blockchain (Hardhat)**: Stores issuer registry, credential anchors, and revocation states. Prevents historical tampering.
3. **Zero-Knowledge Proofs (Circom/SnarkJS)**: Allows credential holders to prove properties (e.g., "CGPA > 3.0", "Degree is valid") to verifiers without revealing the actual underlying data.
4. **AI Forensics (PyTorch CNN)**: A deep learning pipeline built to detect forged document scans (using Error Level Analysis and Perceptual Hashing) if physical scans are presented instead of cryptographically pure VCs.
5. **Full-Stack Application**:
   - **Frontend**: Next.js 14, Tailwind CSS, WalletConnect (zustand).
   - **Backend**: FastAPI (Python), SQLAlchemy (SQLite), PyTorch.

## Directory Structure

- `frontend/`: Next.js web application for Issuers, Holders, and Verifiers.
- `backend/`: FastAPI server handling off-chain data, ZK generation APIs, and AI inference.
- `contracts/`: Hardhat environment with Solidity smart contracts for registry and anchoring.
- `circuits/`: Circom circuits for generating zk-SNARKs.

## Quick Start

### 1. Smart Contracts
```bash
cd contracts
npm install
npx hardhat node
# In a new terminal:
npx hardhat run scripts/deploy.ts --network localhost
```

### 2. Backend API
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 3. Frontend App
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Production Deployment (Docker)
A `docker-compose.yml` is provided for easy deployment of the backend and frontend services.
```bash
docker-compose up -d --build
```

## Features Complete 🚀
- Institutional issuance of VCs with Poseidon commitments.
- Multi-sig revocation registry.
- Zero-Knowledge property proofs (e.g., threshold verification).
- On-chain anchor verification.
- Document forgery detection (CNN-based ELA).
- TrustVerse Score algorithm.

---
Built with ❤️ for a trustless future.
