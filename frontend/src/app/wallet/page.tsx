'use client';
import { useWallet } from '@/store/useWallet';
import { FileBadge, Fingerprint, ShieldCheck, X, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import * as snarkjs from 'snarkjs';
import { Contract } from 'ethers';
import {
  API_URL,
  ADDRESSES,
  GATEWAY_ABI,
  didFromAddress,
  toBytes32,
  groth16ToSolidity,
} from '@/lib/contracts';

function WalletInner() {
  const { address, disconnect, signer } = useWallet();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get('request');

  const [showProofModal, setShowProofModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const holderDid = address ? didFromAddress(address) : '';

  const fetchCredentials = async () => {
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/credentials/holder/${encodeURIComponent(holderDid)}`);
    if (res.ok) setCredentials(await res.json());
  };

  const fetchRequests = async () => {
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/verify/requests?holder_did=${encodeURIComponent(holderDid)}`);
    if (res.ok) {
      const all = await res.json();
      setPendingRequests(all.filter((r: any) => r.status === 'pending'));
      if (requestIdParam) {
        const req = all.find((r: any) => String(r.id) === requestIdParam);
        if (req) {
          setActiveRequest(req);
          setShowProofModal(true);
        }
      }
    }
  };

  useEffect(() => {
    fetchCredentials();
    fetchRequests();
  }, [address, requestIdParam]);

  const pickCredential = () => {
    if (!activeRequest) return credentials[0];
    if (activeRequest.issuer_did) {
      return credentials.find((c) => c.issuer_did === activeRequest.issuer_did && c.status === 'Active') || credentials[0];
    }
    return credentials.find((c) => c.status === 'Active') || credentials[0];
  };

  const handleGenerateAndSubmit = async () => {
    const cred = pickCredential();
    if (!cred?.credential || !signer || !activeRequest) return;
    setIsGenerating(true);
    try {
      const c = cred.credential.trustverseCommitment;
      const threshold = String(activeRequest.threshold);

      const claimInput = {
        credentialRoot: c.credentialRoot,
        threshold,
        subjectId: c.subjectId,
        cgpaScaled: c.cgpaScaled,
        degreeCode: c.degreeCode,
        issueDate: c.issueDate,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
      };

      const { proof: claimProof, publicSignals: claimSignals } = await snarkjs.groth16.fullProve(
        claimInput,
        '/circuits/ClaimProver.wasm',
        '/circuits/ClaimProver_final.zkey'
      );

      const revRes = await fetch(`${API_URL}/api/v1/credentials/revocation/proof/${cred.hash}`);
      if (!revRes.ok) throw new Error('Could not fetch revocation Merkle path');
      const revData = await revRes.json();

      const nonRevInput = {
        credentialRoot: c.credentialRoot,
        revocationTreeRoot: revData.root,
        claimsHash: revData.claimsHash,
        issuerPubKey: c.issuerPubKey,
        salt: c.salt,
        schemaId: c.schemaId,
        pathElements: revData.pathElements,
      };

      const { proof: nonRevProof, publicSignals: nonRevSignals } = await snarkjs.groth16.fullProve(
        nonRevInput,
        '/circuits/NonRevocation.wasm',
        '/circuits/NonRevocation_final.zkey'
      );

      setIsGenerating(false);
      setIsSubmitting(true);

      const gateway = new Contract(ADDRESSES.verificationGateway, GATEWAY_ABI, signer);
      const credHash = toBytes32(cred.hash);
      const claimCalldata = groth16ToSolidity(claimProof, claimSignals);
      const nonRevCalldata = groth16ToSolidity(nonRevProof, nonRevSignals);

      const claimTx = await gateway.verifyClaimProof(
        credHash,
        claimCalldata.pA,
        claimCalldata.pB,
        claimCalldata.pC,
        claimCalldata.pubSignals
      );
      const claimReceipt = await claimTx.wait();

      const nonRevTx = await gateway.verifyNonRevocationProof(
        credHash,
        nonRevCalldata.pA,
        nonRevCalldata.pB,
        nonRevCalldata.pC,
        nonRevCalldata.pubSignals
      );
      const nonRevReceipt = await nonRevTx.wait();

      await fetch(`${API_URL}/api/v1/verify/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: activeRequest.id,
          credential_hash: cred.hash,
          claim_tx_hash: claimReceipt.hash,
          nonrev_tx_hash: nonRevReceipt.hash,
          block_number: claimReceipt.blockNumber,
          result: 'pass',
        }),
      });

      alert('Proofs verified on-chain. Verifier can see the result.');
      setShowProofModal(false);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Proof generation/submission failed');
    } finally {
      setIsGenerating(false);
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <Fingerprint className="h-10 w-10 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Holder Wallet</h1>
          <p className="text-gray-400 text-sm">Connect MetaMask to view credentials and respond to verification requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl relative">
      {showProofModal && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-lg w-full relative">
            <button onClick={() => setShowProofModal(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Request #{activeRequest.id}</h2>
            <p className="text-gray-400 mb-4">
              Prove CGPA &gt;= {activeRequest.threshold_display} without revealing your transcript.
            </p>
            <button
              onClick={handleGenerateAndSubmit}
              disabled={isGenerating || isSubmitting || credentials.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl w-full flex justify-center gap-2 disabled:opacity-50"
            >
              {(isGenerating || isSubmitting) && <Loader2 className="h-5 w-5 animate-spin" />}
              {isGenerating ? 'Generating Groth16 proofs…' : isSubmitting ? 'Submitting on-chain…' : 'Generate & submit proofs'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-72 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center text-center">
            <QRCode value={holderDid} size={120} />
            <p className="text-xs font-mono break-all mt-4 text-gray-400">{holderDid}</p>
            <button onClick={disconnect} className="text-xs text-red-400 mt-3">Disconnect</button>
          </div>
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Pending Requests</h3>
            {pendingRequests.length === 0 && <p className="text-xs text-gray-500">None</p>}
            {pendingRequests.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveRequest(r); setShowProofModal(true); }}
                className="w-full text-left bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-2 hover:bg-blue-500/20"
              >
                <p className="text-sm text-white">CGPA &gt;= {r.threshold_display}</p>
                <p className="text-xs text-gray-400">Request #{r.id}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 glass-panel p-8 rounded-3xl">
          <h2 className="text-2xl font-bold text-white mb-6">Your Credentials</h2>
          {credentials.length === 0 ? (
            <p className="text-gray-500">No credentials yet. Ask your university to issue one to {holderDid}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentials.map((cred) => {
                const subj = cred.credential?.credentialSubject;
                return (
                  <div key={cred.hash} className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-indigo-500/30 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white">{subj?.degree || 'Academic Degree'}</h3>
                    <p className="text-xs text-indigo-300 mb-3">{cred.issuer_did}</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-400">CGPA:</span> <span className="text-white">{subj?.cgpa}</span></p>
                      <p><span className="text-gray-400">Date:</span> <span className="text-white">{subj?.date}</span></p>
                      <p><span className="text-gray-400">Status:</span> <span className={cred.status === 'Active' ? 'text-green-400' : 'text-red-400'}>{cred.status}</span></p>
                      <p><span className="text-gray-400">On-chain:</span> <span className="text-white">{cred.on_chain?.status}</span></p>
                      <p><span className="text-gray-400">Revoked (chain):</span> <span className="text-white">{cred.on_chain_revoked ? 'yes' : 'no'}</span></p>
                    </div>
                    <p className="text-xs font-mono truncate mt-3 text-gray-500">{cred.poseidon_commitment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading wallet…</div>}>
      <WalletInner />
    </Suspense>
  );
}
