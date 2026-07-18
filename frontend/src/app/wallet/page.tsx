'use client';
import { useWallet } from '@/store/useWallet';
import { FileBadge, Fingerprint, Lock, ShieldCheck, X, Key, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState, useEffect } from 'react';
import * as snarkjs from 'snarkjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function WalletPage() {
  const { address, disconnect } = useWallet();
  const [showProofModal, setShowProofModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofResult, setProofResult] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);

  const fetchCredentials = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/credentials/holder/did:ethr:${address}`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [address]);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    try {
      // In a real scenario, this would use the actual credential values and salt
      const input = {
        poseidonCommitment: "123456789", // Mock hash
        threshold: 300,                  // e.g., 3.00 CGPA
        subjectId: 1,
        value: 350,                      // Actual 3.50 CGPA
        salt: 1234
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/CredentialValidator.wasm",
        "/circuits/CredentialValidator_final.zkey"
      );

      setProofResult({ proof, publicSignals });
    } catch (e) {
      console.error(e);
      alert("Failed to generate ZK proof. Check circuit files.");
    }
    setIsGenerating(false);
  };

  const handleSubmitProof = async () => {
    if (!proofResult) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/verify/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_hash: credentials[0]?.hash || "0xmock",
          proof: proofResult.proof,
          public_signals: proofResult.publicSignals
        })
      });
      if (res.ok) {
        alert("Proof verified successfully!");
        setShowProofModal(false);
        setProofResult(null);
      } else {
        alert("Proof verification failed.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Fingerprint className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Access Wallet</h1>
          <p className="text-gray-400 text-sm">
            Connect your wallet to access your encrypted verifiable credentials and respond to verification requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl relative">
      {/* Proof Modal */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-lg w-full relative">
            <button onClick={() => setShowProofModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Request</h2>
            <p className="text-gray-400 mb-6">A verifier is requesting proof that your CGPA is &gt;= 3.0</p>
            
            {proofResult ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">Proof Generated Successfully!</h3>
                <p className="text-sm text-gray-400 mb-4">Your underlying data was not exposed.</p>
                <button 
                  onClick={handleSubmitProof}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl w-full flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {isSubmitting ? 'Submitting...' : 'Submit Proof to Verifier'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-black/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                  <Lock className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Academic Degree v1.0</p>
                    <p className="text-sm text-gray-400">Your CGPA is hidden</p>
                  </div>
                </div>
                <button 
                  onClick={handleGenerateProof}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {isGenerating ? 'Generating ZK Proof...' : 'Generate Zero-Knowledge Proof'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="bg-white p-2 rounded-xl mb-4 border-2 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <QRCode value={`did:ethr:${address}`} size={120} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Holder Identity</h3>
            <p className="text-xs text-gray-400 font-mono break-all bg-black/30 p-2 rounded-lg w-full mb-4">
              did:ethr:{address}
            </p>
            <button 
              onClick={disconnect}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Disconnect Wallet
            </button>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Incoming Requests</h3>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                 onClick={() => setShowProofModal(true)}>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                <p className="text-sm font-medium text-white">CGPA Verification</p>
              </div>
              <p className="text-xs text-gray-400">University of Tech wants to verify your CGPA is &gt;= 3.0</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 glass-panel p-8 rounded-3xl w-full min-h-[400px]">
          <h2 className="text-2xl font-bold text-white mb-6">Your Credentials</h2>
          {credentials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentials.map((cred, i) => (
                <div key={i} className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-indigo-500/30 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <ShieldCheck className="h-6 w-6 text-indigo-400/50" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Academic Degree</h3>
                  <p className="text-xs text-indigo-300 mb-4">{cred.issuer_did}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-medium ${cred.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{cred.status}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white">{new Date(cred.anchored_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 font-mono truncate">{cred.hash}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <FileBadge className="h-12 w-12 text-gray-600" />
              <p className="text-gray-400">No credentials received yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
