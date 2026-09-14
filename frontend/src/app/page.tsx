'use client';
import Link from 'next/link';
import { Shield, Fingerprint, ScanSearch, PlayCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { API_URL } from '@/lib/contracts';

export default function Home() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  const runDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/demo/seed`, { method: 'POST' });
      const data = await res.json();
      setSeedResult(data);
    } catch (e) {
      console.error(e);
      alert('Start the backend first (./scripts/dev.sh)');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-16 pb-16 px-4 max-w-5xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-extrabold text-white text-center mb-4">
        Privacy-preserving <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">credential verification</span>
      </h1>
      <p className="text-gray-400 text-lg text-center max-w-2xl mb-8">
        Universities issue anchored credentials. Students prove CGPA thresholds with zero-knowledge proofs.
        Employers verify on-chain without seeing transcripts. Legacy scans get an AI forensics fallback.
      </p>

      <button
        onClick={runDemo}
        disabled={seeding}
        className="mb-10 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold disabled:opacity-50"
      >
        {seeding ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
        Run guided demo (seed data)
      </button>

      {seedResult && (
        <div className="glass-panel p-6 rounded-2xl mb-10 w-full text-sm text-gray-300">
          <p className="text-white font-bold mb-2">Demo seeded</p>
          <p>University DID: {seedResult.university_did}</p>
          <p>Alice (holder): {seedResult.alice_did} — CGPA 8.9, active</p>
          <p>Bob (holder): {seedResult.bob_did} — revoked</p>
          <p>Pending request #{seedResult.pending_request_id} — connect Hardhat account #1 as Alice, open Wallet</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        <Link href="/issuer" className="glass-panel p-8 rounded-3xl hover:-translate-y-1 transition-transform">
          <Fingerprint className="h-8 w-8 text-indigo-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Issuer</h2>
          <p className="text-sm text-gray-400">Register on-chain, issue W3C VCs, anchor Poseidon commitments, revoke credentials.</p>
        </Link>
        <Link href="/wallet" className="glass-panel p-8 rounded-3xl hover:-translate-y-1 transition-transform">
          <Shield className="h-8 w-8 text-blue-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Holder</h2>
          <p className="text-sm text-gray-400">Decrypt credentials, respond to verifier requests with ClaimProver + NonRevocation proofs.</p>
        </Link>
        <Link href="/verifier" className="glass-panel p-8 rounded-3xl hover:-translate-y-1 transition-transform">
          <ScanSearch className="h-8 w-8 text-emerald-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Verifier</h2>
          <p className="text-sm text-gray-400">Request threshold proofs, poll on-chain results, optional ELA-CNN on legacy scans.</p>
        </Link>
      </div>

      <div className="glass-panel p-6 rounded-2xl w-full text-left">
        <h3 className="text-white font-bold mb-3">Happy path (thesis demo)</h3>
        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
          <li>Issuer registers and issues a degree to a student DID.</li>
          <li>CredentialRoot is anchored in CredentialAnchor via MetaMask.</li>
          <li>Verifier creates a CGPA &gt;= 8.0 request; holder generates Groth16 proofs in-browser.</li>
          <li>VerificationGateway verifies on-chain; verifier sees pass/fail only.</li>
          <li>Optional: upload a scan for ELA heatmap + trained CNN score.</li>
        </ol>
      </div>
    </div>
  );
}
