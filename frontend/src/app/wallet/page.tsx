'use client';
import { useWallet } from '@/store/useWallet';
import { FileBadge, Fingerprint, Lock, ShieldCheck, X, Key } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState } from 'react';
import * as snarkjs from 'snarkjs';

export default function WalletPage() {
  const { address, disconnect } = useWallet();
  const [showProofModal, setShowProofModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proofResult, setProofResult] = useState<any>(null);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    try {
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
    }
    setIsGenerating(false);
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
                  onClick={() => setShowProofModal(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl w-full"
                >
                  Submit Proof to Verifier
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 transition-all"
                >
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
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <FileBadge className="h-12 w-12 text-gray-600" />
            <p className="text-gray-400">No credentials received yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
